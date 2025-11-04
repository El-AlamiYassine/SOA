// État global de l'application
const etatApplication = {
  clients: [],
  ventes: [],
  stock: {
    'Produit A': 50,
    'Produit B': 30,
    'Produit C': 20
  },
  factures: [],
  messagesESB: []
};

// Méthode ESB - Routeur Central
class ESB {
  constructor() {
    this.middlewares = [];
  }

  // Envoyer un message via l'ESB
  async envoyerMessage(destinataire, action, donnees) {
    const message = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      source: 'ESB',
      destinataire,
      action,
      donnees,
      statut: 'en_cours'
    };

    this.ajouterLogMessage(`ESB → Routage vers ${destinataire}: ${action}`, 'esb');

    // Simulation traitement ESB
    await this.simulerTraitementESB();

    // Appel du service destinataire
    const reponse = await this.appelerService(destinataire, action, donnees);

    message.statut = reponse.success ? 'termine' : 'erreur';
    message.reponse = reponse;

    this.ajouterLogMessage(`ESB ← Réponse de ${destinataire}: ${reponse.message || action}`, 'service');

    return reponse;
  }

  // Appeler un service spécifique
  async appelerService(service, action, donnees) {
    switch (service) {
      case 'gestion':
        return await ServiceGestion.traiterRequete(action, donnees);
      case 'ventes':
        return await ServiceVentes.traiterRequete(action, donnees);
      case 'stock':
        return await ServiceStock.traiterRequete(action, donnees);
      case 'facturation':
        return await ServiceFacturation.traiterRequete(action, donnees);
      default:
        return { success: false, error: 'Service inconnu' };
    }
  }

  // Simuler le traitement ESB
  async simulerTraitementESB() {
    return new Promise(resolve => {
      setTimeout(resolve, 300 + Math.random() * 700);
    });
  }

  // Ajouter un log de message
  ajouterLogMessage(message, type = 'esb') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    const logContainer = document.getElementById('message-log');
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Animation visuelle
    const esbElement = document.getElementById('esb');
    esbElement.classList.add('message-flash');
    setTimeout(() => esbElement.classList.remove('message-flash'), 1000);
  }
}

// Services Métier - Implémentations
class ServiceGestion {
  static async traiterRequete(action, donnees) {
    switch (action) {
      case 'creerClient':
        const nouveauClient = {
          id: 'CLI' + Date.now(),
          nom: donnees.nom || 'Client ' + (etatApplication.clients.length + 1),
          email: donnees.email || `client${etatApplication.clients.length + 1}@example.com`,
          dateCreation: new Date().toLocaleDateString()
        };
        etatApplication.clients.push(nouveauClient);
        this.mettreAJourAffichage('gestion', `Client créé: ${nouveauClient.nom} (${nouveauClient.id})`);
        return { success: true, client: nouveauClient, message: 'Client créé avec succès' };

      case 'listerClients':
        const listeClients = etatApplication.clients.map(c => `${c.nom} (${c.id})`).join(', ') || 'Aucun client';
        this.mettreAJourAffichage('gestion', `Clients: ${listeClients}`);
        return { success: true, clients: etatApplication.clients, message: 'Liste des clients récupérée' };

      default:
        return { success: false, error: 'Action non supportée' };
    }
  }

  static mettreAJourAffichage(service, contenu) {
    const element = document.getElementById(`data-${service}`);
    if (element) {
      element.textContent = contenu;
    }
  }
}

class ServiceVentes {
  static async traiterRequete(action, donnees) {
    switch (action) {
      case 'creerVente':
        // Vérifier d'abord le stock via ESB
        const verificationStock = await esb.envoyerMessage('stock', 'verifierStock', {
          produit: donnees.produit || 'Produit A',
          quantite: donnees.quantite || 1
        });

        if (!verificationStock.success || !verificationStock.stockSuffisant) {
          return { success: false, error: 'Stock insuffisant' };
        }

        const nouvelleVente = {
          id: 'VENTE' + Date.now(),
          clientId: donnees.clientId || etatApplication.clients[0]?.id,
          produit: donnees.produit || 'Produit A',
          quantite: donnees.quantite || 1,
          date: new Date().toLocaleString(),
          statut: 'en_attente_paiement'
        };
        etatApplication.ventes.push(nouvelleVente);
        this.mettreAJourAffichage('ventes', `Vente créée: ${nouvelleVente.produit} x${nouvelleVente.quantite}`);
        return { success: true, vente: nouvelleVente, message: 'Vente créée avec succès' };

      case 'historiqueVentes':
        const historique = etatApplication.ventes.map(v =>
          `${v.produit} x${v.quantite} (${v.date})`
        ).join('; ') || 'Aucune vente';
        this.mettreAJourAffichage('ventes', `Historique: ${historique}`);
        return { success: true, ventes: etatApplication.ventes, message: 'Historique récupéré' };

      default:
        return { success: false, error: 'Action non supportée' };
    }
  }

  static mettreAJourAffichage(service, contenu) {
    const element = document.getElementById(`data-${service}`);
    if (element) {
      element.textContent = contenu;
    }
  }
}

class ServiceStock {
  static async traiterRequete(action, donnees) {
    switch (action) {
      case 'verifierStock':
        const produit = donnees.produit;
        const quantiteDemandee = donnees.quantite || 1;
        const stockActuel = etatApplication.stock[produit] || 0;
        const stockSuffisant = stockActuel >= quantiteDemandee;

        this.mettreAJourAffichage('stock',
          `Stock ${produit}: ${stockActuel} unités - Demande: ${quantiteDemandee} - Suffisant: ${stockSuffisant ? 'OUI' : 'NON'}`
        );
        return {
          success: true,
          stockSuffisant,
          stockActuel,
          message: `Vérification stock ${produit}: ${stockSuffisant ? 'OK' : 'INSUFFISANT'}`
        };

      case 'majStock':
        const produitMaj = donnees.produit;
        const nouvelleQuantite = donnees.quantite;
        if (produitMaj && nouvelleQuantite !== undefined) {
          etatApplication.stock[produitMaj] = nouvelleQuantite;
          this.mettreAJourAffichage('stock',
            `Stock ${produitMaj} mis à jour: ${nouvelleQuantite} unités`
          );
          return { success: true, message: `Stock ${produitMaj} mis à jour` };
        }
        return { success: false, error: 'Données de mise à jour invalides' };

      default:
        return { success: false, error: 'Action non supportée' };
    }
  }

  static mettreAJourAffichage(service, contenu) {
    const element = document.getElementById(`data-${service}`);
    if (element) {
      element.textContent = contenu;
    }
  }
}

class ServiceFacturation {
  static async traiterRequete(action, donnees) {
    switch (action) {
      case 'genererFacture':
        const nouvelleFacture = {
          id: 'FACT' + Date.now(),
          venteId: donnees.venteId,
          montant: donnees.montant || 100,
          date: new Date().toLocaleString(),
          statut: 'generée'
        };
        etatApplication.factures.push(nouvelleFacture);
        this.mettreAJourAffichage('facturation',
          `Facture générée: ${nouvelleFacture.montant}€ pour vente ${nouvelleFacture.venteId}`
        );
        return { success: true, facture: nouvelleFacture, message: 'Facture générée avec succès' };

      case 'facturesEnAttente':
        const facturesAttente = etatApplication.factures.filter(f => f.statut === 'generée');
        const listeFactures = facturesAttente.map(f =>
          `Facture ${f.id}: ${f.montant}€`
        ).join('; ') || 'Aucune facture en attente';
        this.mettreAJourAffichage('facturation', `Factures en attente: ${listeFactures}`);
        return { success: true, factures: facturesAttente, message: 'Factures en attente récupérées' };

      default:
        return { success: false, error: 'Action non supportée' };
    }
  }

  static mettreAJourAffichage(service, contenu) {
    const element = document.getElementById(`data-${service}`);
    if (element) {
      element.textContent = contenu;
    }
  }
}

// Instance ESB globale
const esb = new ESB();

// Fonctions d'interface
async function appelerService(service, action) {
  const donnees = genererDonneesTest(service, action);
  await esb.envoyerMessage(service, action, donnees);
}

function genererDonneesTest(service, action) {
  const donneesTest = {
    gestion: {
      creerClient: { nom: `Client Test ${Date.now()}`, email: `test${Date.now()}@example.com` },
      listerClients: {}
    },
    ventes: {
      creerVente: { produit: 'Produit A', quantite: 2 },
      historiqueVentes: {}
    },
    stock: {
      verifierStock: { produit: 'Produit A', quantite: 1 },
      majStock: { produit: 'Produit A', quantite: 40 }
    },
    facturation: {
      genererFacture: { venteId: 'VENTE' + Date.now(), montant: 150 },
      facturesEnAttente: {}
    }
  };

  return donneesTest[service]?.[action] || {};
}

// Processus métier complet
async function executerProcessusComplet() {
  const logsProcessus = document.getElementById('process-logs');
  logsProcessus.innerHTML = '<div>🚀 Démarrage processus vente complet...</div>';

  try {
    // Étape 1: Création client
    logsProcessus.innerHTML += '<div>1. Création du client...</div>';
    const client = await esb.envoyerMessage('gestion', 'creerClient', {
      nom: 'Pierre Martin',
      email: 'pierre.martin@example.com'
    });

    if (!client.success) throw new Error('Échec création client');

    // Étape 2: Création vente
    logsProcessus.innerHTML += '<div>2. Création de la vente...</div>';
    const vente = await esb.envoyerMessage('ventes', 'creerVente', {
      clientId: client.client.id,
      produit: 'Produit A',
      quantite: 3
    });

    if (!vente.success) throw new Error('Échec création vente');

    // Étape 3: Génération facture
    logsProcessus.innerHTML += '<div>3. Génération de la facture...</div>';
    const facture = await esb.envoyerMessage('facturation', 'genererFacture', {
      venteId: vente.vente.id,
      montant: 300
    });

    if (!facture.success) throw new Error('Échec génération facture');

    logsProcessus.innerHTML += '<div style="color: green; font-weight: bold;">✅ Processus terminé avec succès!</div>';

  } catch (error) {
    logsProcessus.innerHTML += `<div style="color: red; font-weight: bold;">❌ Erreur: ${error.message}</div>`;
  }
}

function reinitialiserSysteme() {
  // Réinitialiser l'état
  etatApplication.clients = [];
  etatApplication.ventes = [];
  etatApplication.factures = [];
  etatApplication.stock = {
    'Produit A': 50,
    'Produit B': 30,
    'Produit C': 20
  };

  // Réinitialiser l'affichage
  document.querySelectorAll('.service-data').forEach(el => el.textContent = '');
  document.getElementById('process-logs').innerHTML = '';
  document.getElementById('message-log').innerHTML =
    '<div class="log-entry">Système réinitialisé - ESB prêt à router les messages</div>';

  esb.ajouterLogMessage('Système réinitialisé avec succès', 'esb');
}

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
  esb.ajouterLogMessage('Application SOA avec ESB initialisée', 'esb');
});