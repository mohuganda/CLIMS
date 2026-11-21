package auth

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gofiber/fiber/v3"

	"clims-backend/internal/features/users"
)

type syncAccounts interface {
	ListIdentitySyncAccounts(context.Context, *uuid.UUID, int) ([]users.IdentitySyncAccount, error)
	LinkOIDCIdentity(context.Context, uuid.UUID, string, string) error
}

// RegisterIdentitySync exposes reconciliation to one dedicated Keycloak client.
func RegisterIdentitySync(ctx context.Context, app *fiber.App, repo syncAccounts, issuer, serviceClient string) error {
	u, err := url.Parse(issuer)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || serviceClient == "" || serviceClient == "clims" {
		return errors.New("CLIMS identity sync requires an HTTPS issuer and a dedicated service client")
	}
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return err
	}
	const audience = "clims"
	verifier := provider.Verifier(&oidc.Config{ClientID: audience, SupportedSigningAlgs: []string{oidc.RS256}})
	group := app.Group("/api/v1/internal/identity-sync", func(c fiber.Ctx) error {
		c.Set("Cache-Control", "no-store")
		scheme, token, found := strings.Cut(c.Get("Authorization"), " ")
		if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
			return fiber.ErrUnauthorized
		}
		ctx, cancel := context.WithTimeout(c.Context(), 10*time.Second)
		defer cancel()
		verified, err := verifier.Verify(ctx, token)
		if err != nil || verified.Subject == "" {
			return fiber.ErrUnauthorized
		}
		var claims struct {
			Type   string `json:"typ"`
			Client string `json:"azp"`
			Roles  map[string]struct {
				Roles []string `json:"roles"`
			} `json:"resource_access"`
		}
		if err := verified.Claims(&claims); err != nil || claims.Type != "Bearer" || claims.Client != serviceClient ||
			!slices.Contains(claims.Roles[audience].Roles, "identity_sync") {
			return fiber.ErrForbidden
		}
		c.SetContext(ctx)
		return c.Next()
	})
	group.Get("/accounts", func(c fiber.Ctx) error {
		var cursor *uuid.UUID
		if raw := c.Query("after"); raw != "" {
			id, err := uuid.Parse(raw)
			if err != nil || id == uuid.Nil {
				return fiber.ErrBadRequest
			}
			cursor = &id
		}
		const pageSize = 100
		rows, err := repo.ListIdentitySyncAccounts(c.Context(), cursor, pageSize)
		if err != nil {
			return fiber.ErrInternalServerError
		}
		type account struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		}
		accounts := make([]account, 0, len(rows))
		for _, row := range rows {
			accounts = append(accounts, account{ID: row.ID.String(), Email: row.Email})
		}
		next := ""
		if len(accounts) == pageSize {
			next = accounts[len(accounts)-1].ID
		}
		return c.JSON(fiber.Map{"accounts": accounts, "nextCursor": next})
	})
	group.Put("/accounts/:id/identity", func(c fiber.Ctx) error {
		id, err := uuid.Parse(c.Params("id"))
		var body struct {
			Issuer  string `json:"issuer"`
			Subject string `json:"subject"`
		}
		if err != nil || id == uuid.Nil || len(c.Body()) > 4096 || json.Unmarshal(c.Body(), &body) != nil ||
			body.Issuer != issuer || strings.TrimSpace(body.Subject) == "" || len(body.Subject) > 255 {
			return fiber.ErrBadRequest
		}
		err = repo.LinkOIDCIdentity(c.Context(), id, issuer, body.Subject)
		switch {
		case err == nil:
			return c.SendStatus(fiber.StatusNoContent)
		case errors.Is(err, users.ErrIdentityAccountIneligible):
			return fiber.ErrNotFound
		case errors.Is(err, users.ErrIdentityLinkConflict):
			return fiber.ErrConflict
		default:
			return fiber.ErrInternalServerError
		}
	})
	return nil
}
