import { AppFrame } from '@/navigation/AppFrame';

/** Every signed-in screen: behind the guard, inside the shell. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return <AppFrame>{children}</AppFrame>;
}
