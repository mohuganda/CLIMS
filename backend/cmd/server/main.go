package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"time"

	"clims-backend/internal/config"
	"clims-backend/internal/database"
	"clims-backend/internal/features/apidocs"
	"clims-backend/internal/features/auth"
	"clims-backend/internal/features/catalogue"
	"clims-backend/internal/features/health"
	"clims-backend/internal/features/hotspots"
	"clims-backend/internal/features/inventory"
	"clims-backend/internal/features/locations"
	"clims-backend/internal/features/notifications"
	"clims-backend/internal/features/orders"
	"clims-backend/internal/features/rbac"
	"clims-backend/internal/features/users"
	"clims-backend/internal/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Version variables injected at build time via -ldflags
var (
	Version    = "2.2.1"
	CommitHash = "none"
	BuildTime  = "unknown"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	if err := database.RunMigrations(cfg.DSN()); err != nil {
		log.Fatalf("Migration error: %v", err)
	}

	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, cfg.DSN())
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
	}
	defer dbPool.Close()

	app := fiber.New()
	app.Use(recover.New())
	// Sets X-Request-ID so a logged failure can be matched to the request that caused it.
	app.Use(requestid.New())
	app.Use(middleware.NewSlogLogger())

	app.Use(helmet.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	docsDir := os.Getenv("DOCS_DIR")
	if docsDir == "" {
		docsDir = "../docs"
	}
	apidocs.RegisterRoutes(app, os.DirFS(filepath.Join(docsDir, "api")))

	// Register Health Probes with Version info
	healthHandler := health.NewHandler(dbPool, Version, CommitHash, BuildTime)
	health.RegisterRoutes(app, healthHandler)

	v1 := app.Group("/api/v1")
	jwtAuthMiddleware := middleware.NewJWTMiddleware(cfg.JWTSecret)

	userRepo := users.NewRepository(dbPool)
	if client := os.Getenv("IDENTITY_SYNC_CLIENT_ID"); client != "" {
		discoveryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		err := auth.RegisterIdentitySync(discoveryCtx, app, userRepo, os.Getenv("OIDC_ISSUER"), client)
		cancel()
		if err != nil {
			log.Fatalf("CLIMS identity sync configuration: %v", err)
		}
	}
	userService := users.NewService(userRepo)
	roleRepo := rbac.NewRepository(dbPool)
	activeUser := users.ActiveUser(userRepo)

	// One notification service for every feature; each registers its own types.
	notifier := notifications.NewService()
	notifier.MustRegister(hotspots.NotificationTypes()...)
	notifier.MustRegister(orders.NotificationTypes()...)

	auth.RegisterRoutes(v1, auth.NewHandler(userRepo, userService, cfg.JWTSecret), jwtAuthMiddleware, activeUser)
	users.RegisterRoutes(v1, users.NewHandler(userRepo, userService), jwtAuthMiddleware, activeUser)
	rbac.RegisterRoutes(v1, rbac.NewHandler(roleRepo), jwtAuthMiddleware, activeUser)
	orders.RegisterRoutes(v1, orders.NewRepository(dbPool, notifier), jwtAuthMiddleware, activeUser)
	hotspots.RegisterRoutes(v1, hotspots.NewRepository(dbPool, notifier), jwtAuthMiddleware, activeUser)
	inventory.RegisterRoutes(v1, inventory.NewRepository(dbPool), jwtAuthMiddleware, activeUser)
	locations.RegisterRoutes(v1, locations.NewHandler(dbPool), jwtAuthMiddleware, activeUser)
	notifications.RegisterRoutes(v1, notifications.NewRepository(dbPool), jwtAuthMiddleware, activeUser)
	catalogue.RegisterRoutes(v1, catalogue.NewRepository(dbPool), jwtAuthMiddleware, activeUser)

	log.Printf("Server starting on port %s (Version: %s, Commit: %s)...", cfg.Port, Version, CommitHash)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
