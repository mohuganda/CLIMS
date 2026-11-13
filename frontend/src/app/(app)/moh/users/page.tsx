import UsersPage from '@/features/users/UsersPage';
import { pageMetadata } from '@/navigation/pageMetadata';

export const metadata = pageMetadata('/moh/users');

export default function Page() {
  return <UsersPage />;
}
