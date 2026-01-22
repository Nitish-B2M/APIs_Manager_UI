import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/routers/app';

export const trpc = createTRPCReact<AppRouter>();
