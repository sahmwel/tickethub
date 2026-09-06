// frontend/src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Navigation
      "nav.home": "Home",
      "nav.events": "Events",
      "nav.organizer": "Organizer Dashboard",
      "nav.admin": "Admin Dashboard",
      "nav.login": "Login",
      "nav.signup": "Sign Up",
      "nav.logout": "Logout",
      
      // Common
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.view": "View",
      "common.close": "Close",
      "common.back": "Back",
      "common.continue": "Continue",
      "common.search": "Search",
      
      // Events
      "events.title": "All Events",
      "events.found": "events found",
      "events.noResults": "No events found",
      "events.upcoming": "Upcoming Events",
      "events.past": "Past Events",
      "events.featured": "Featured Events",
      
      // Tickets
      "tickets.title": "Tickets",
      "tickets.sold": "Sold",
      "tickets.available": "Available",
      "tickets.total": "Total",
      "tickets.price": "Price",
      "tickets.quantity": "Quantity",
      
      // Checkout
      "checkout.title": "Checkout",
      "checkout.buyer": "Buyer Information",
      "checkout.payment": "Payment Method",
      "checkout.confirm": "Confirm Payment",
      "checkout.success": "Payment Successful!",
      "checkout.fail": "Payment Failed",
      
      // Organizer
      "organizer.dashboard": "Dashboard",
      "organizer.create": "Create Event",
      "organizer.edit": "Edit Event",
      "organizer.stats": "Event Stats",
      "organizer.scan": "Scan Tickets",
      "organizer.payout": "Payout Settings",
      
      // Admin
      "admin.dashboard": "Admin Dashboard",
      "admin.users": "Users",
      "admin.events": "Events",
      "admin.payouts": "Payouts",
      "admin.settings": "Settings",
      "admin.refunds": "Refunds"
    }
  },
  fr: {
    translation: {
      "nav.home": "Accueil",
      "nav.events": "Événements",
      "nav.organizer": "Tableau de bord organisateur",
      "nav.admin": "Tableau de bord admin",
      "nav.login": "Connexion",
      "nav.signup": "S'inscrire",
      "nav.logout": "Déconnexion",
      
      "common.loading": "Chargement...",
      "common.error": "Erreur",
      "common.success": "Succès",
      "common.save": "Enregistrer",
      "common.cancel": "Annuler",
      "common.delete": "Supprimer",
      "common.edit": "Modifier",
      "common.view": "Voir",
      "common.close": "Fermer",
      "common.back": "Retour",
      "common.continue": "Continuer",
      "common.search": "Rechercher",
      
      "events.title": "Tous les événements",
      "events.found": "événements trouvés",
      "events.noResults": "Aucun événement trouvé",
      "events.upcoming": "Événements à venir",
      "events.past": "Événements passés",
      "events.featured": "Événements en vedette",
      
      "tickets.title": "Billets",
      "tickets.sold": "Vendus",
      "tickets.available": "Disponibles",
      "tickets.total": "Total",
      "tickets.price": "Prix",
      "tickets.quantity": "Quantité",
      
      "checkout.title": "Paiement",
      "checkout.buyer": "Informations acheteur",
      "checkout.payment": "Moyen de paiement",
      "checkout.confirm": "Confirmer le paiement",
      "checkout.success": "Paiement réussi !",
      "checkout.fail": "Paiement échoué",
      
      "organizer.dashboard": "Tableau de bord",
      "organizer.create": "Créer un événement",
      "organizer.edit": "Modifier l'événement",
      "organizer.stats": "Statistiques",
      "organizer.scan": "Scanner les billets",
      "organizer.payout": "Paramètres de paiement",
      
      "admin.dashboard": "Tableau de bord admin",
      "admin.users": "Utilisateurs",
      "admin.events": "Événements",
      "admin.payouts": "Paiements",
      "admin.settings": "Paramètres",
      "admin.refunds": "Remboursements"
    }
  },
  es: {
    translation: {
      "nav.home": "Inicio",
      "nav.events": "Eventos",
      "nav.organizer": "Panel organizador",
      "nav.admin": "Panel admin",
      "nav.login": "Iniciar sesión",
      "nav.signup": "Registrarse",
      "nav.logout": "Cerrar sesión",
      
      "common.loading": "Cargando...",
      "common.error": "Error",
      "common.success": "Éxito",
      "common.save": "Guardar",
      "common.cancel": "Cancelar",
      "common.delete": "Eliminar",
      "common.edit": "Editar",
      "common.view": "Ver",
      "common.close": "Cerrar",
      "common.back": "Volver",
      "common.continue": "Continuar",
      "common.search": "Buscar",
      
      "events.title": "Todos los eventos",
      "events.found": "eventos encontrados",
      "events.noResults": "No se encontraron eventos",
      "events.upcoming": "Próximos eventos",
      "events.past": "Eventos pasados",
      "events.featured": "Eventos destacados",
      
      "tickets.title": "Entradas",
      "tickets.sold": "Vendidas",
      "tickets.available": "Disponibles",
      "tickets.total": "Total",
      "tickets.price": "Precio",
      "tickets.quantity": "Cantidad",
      
      "checkout.title": "Pagar",
      "checkout.buyer": "Información del comprador",
      "checkout.payment": "Método de pago",
      "checkout.confirm": "Confirmar pago",
      "checkout.success": "¡Pago exitoso!",
      "checkout.fail": "Pago fallido",
      
      "organizer.dashboard": "Panel",
      "organizer.create": "Crear evento",
      "organizer.edit": "Editar evento",
      "organizer.stats": "Estadísticas",
      "organizer.scan": "Escanear entradas",
      "organizer.payout": "Configuración de pagos",
      
      "admin.dashboard": "Panel admin",
      "admin.users": "Usuarios",
      "admin.events": "Eventos",
      "admin.payouts": "Pagos",
      "admin.settings": "Configuración",
      "admin.refunds": "Reembolsos"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;