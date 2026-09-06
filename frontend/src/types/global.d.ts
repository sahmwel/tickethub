// frontend/src/types/global.d.ts
import { EventWithTicketTypes } from './index';

declare module './index' {
  interface EventWithTicketTypes {
    _isLive?: boolean;
    _isNew?: boolean;
  }
}