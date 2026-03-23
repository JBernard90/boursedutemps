
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, db, onAuthStateChanged, collection, onSnapshot, query, where, orderBy, doc, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from './api';
import { Page, User, Service, Request, BlogPost, Testimonial, ForumTopic, Transaction, Connection, ChatMessage } from './types';
import Navbar from './components/Navbar';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const Members = lazy(() => import('./pages/Members'));
const Forum = lazy(() => import('./pages/Forum'));
const Blog = lazy(() => import('./pages/Blog'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const Profile = lazy(() => import('./pages/Profile'));
const Moderation = lazy(() => import('./pages/Moderation'));
const MessagesPage = lazy(() => import('./pages/Messages'));
import AuthModal from './components/AuthModal';

const ADMIN_EMAIL = 'jeanbernardpierrelouis@gmail.com';

const PRIVACY_TEXT = `POLITIQUE DE CONFIDENTIALITÉ – Bourse du Temps
1. Introduction
Le site Bourse du Temps (https://boursedutemps.vercel.app/) accorde une grande importance à la protection de vos données personnelles.
La présente Politique de Confidentialité explique quelles informations nous collectons, comment nous les utilisons et quels sont vos droits.
En utilisant notre site, vous acceptez les pratiques décrites ci-dessous.

2. Données collectées
2.1 Données fournies volontairement
Lorsque vous utilisez notre formulaire de contact, nous collectons :
• 	Nom et prénom
• 	Adresse e‑mail
• 	Message ou informations que vous choisissez de nous transmettre
2.2 Données collectées automatiquement
Lors de votre navigation au site :
• 	Adresse IP
• 	Type de navigateur et appareil
• 	Pages consultées
• 	Données analytiques anonymisées
• 	Cookies techniques et analytiques

3. Finalités de la collecte
Les données collectées servent à :
• 	Répondre à vos demandes via le formulaire
• 	Améliorer l’expérience utilisateur
• 	Assurer le fonctionnement technique du site
• 	Analyser l’audience et les performances du site
Aucune donnée n’est utilisée à des fins commerciales.

4. Partage des données
Vos données ne sont jamais vendues.
Elles peuvent être partagées uniquement avec :
• 	Notre hébergeur
• 	Nos outils techniques (ex : Vercel, services d’analyse)
• 	Les autorités légales en cas d’obligation

5. Cookies
Le site utilse des cookies pour :
• 	Assurer son bon fonctionnement
• 	Mesurer l’audience
• 	Optimiser les performances
Vous pouvez désactiver les cookies via les paramètres de votre navigateur.

6. Sécurité
Nous mettons en place des mesures techniques pour protéger vos données contre :
• 	L’accès non autorisé
• 	La perte
• 	La modification
• 	La divulgation

7. Durée de conservation
Les données envoyées via le formulaire sont conservées uniquement le temps nécessaire au traitement de votre demande.

MENTIONS LÉGALES – Bourse du Temps
1. Éditeur du site
Nom / Raison sociale : PIERRE LOUIS Jean Bernard
Adresse : Université Senghor
Quartier des Universités - Axe Central
Ville Borg El-Arab El-Gedida - 5220220 Égypte
Email : jean.pierre-louis.2025@etu-usenghor.org
Téléphone : +509 32 27 4422

2. Directeur de la publication
PIERRE LOUIS Jean Bernard 

3. Hébergeur
Le site est hébergé par :
Vercel Inc.
340 S Lemon Ave #4133
Walnut, CA 91789
États‑Unis

4. Propriété intellectuelle
Tous les contenus présents sur le site (textes, images, logos, design) sont protégés par le droit d’auteur.
Toute reproduction sans autorisation est interdite.

5. Responsabilité
L’éditeur ne peut être tenu responsable :
• 	D’interruptions du site
• 	D’erreurs ou omissions dans le contenu
• 	De dommages liés à l’utilisation du site
• 	Des liens externes présents sur le site

CONDITIONS GÉNÉRALES D’UTILISATION (CGU)
1. Objet
Les présentes CGU encadrent l’utilisation du site Bourse du Temps.

2. Accès au site
Le site est accessible gratuitement à tout (e) auditeur (trice) du campus de l'Université Senghor à Alexandrie.

3. Services proposés
Le site propose :
• 	Des informations sur le concept Bourse du Temps
• 	Un formulaire de contact
• 	Une présentation des services
Aucune transaction monétaire n’est effectuée sur le site.

4. Obligations de l’utilisateur
L’utilisateur s’engage à :
• 	Ne pas utiliser le site à des fins illégales
• 	Ne pas tenter d’accéder aux données d’autres utilisateurs
• 	Fournir des informations exactes via le formulaire

5. Propriété intellectuelle
Tous les contenus du site sont protégés.
Toute reproduction est interdite sans autorisation écrite.

6. Données personnelles
L’utilisation du site implique l’acceptation de notre Politique de Confidentialité.

7. Limitation de responsabilité
Nous ne garantissons pas :
• 	L’absence d’erreurs
• 	La disponibilité permanente du site
• 	L’exactitude des informations

8. Modification des CGU
Les CGU peuvent être modifiées à tout moment.
La version en vigueur est celle affichée sur le site.

9. Droit applicable
Les présentes CGU sont soumises au droit égyptien et aux règlements de l'Université Senghor à Alexandrie.`;

const TERMS_TEXT = `LOI DE CONDITIONS D’ÉCHANGE – BOURSE DU TEMPS
1. Objet de la Loi
La présente Loi de Conditions d’Échange a pour objectif d’encadrer les échanges de services, de compétences et de temps entre les utilisateurs du site Bourse du Temps (https://boursedutemps.vercel.app).
Elle définit les droits, obligations et responsabilités de chaque participant afin de garantir un environnement sûr, équitable et respectueux.

2. Définitions
• 	Utilisateur : toute personne accédant au site ou participant à un échange.
• 	Offreur : utilisateur proposant un service ou une compétence.
• 	Demandeur : utilisateur sollicitant un service ou une compétence.
• 	Échange : prestation réalisée entre deux utilisateurs, basée un principe de temps contre temps ou service contre service.
• 	Crédit‑Temps : unité symbolique représentant la valeur d’un échange (si applicable).

3. Nature des Échanges
3.1 Gratuité
Les échanges réalisés via Bourse du Temps sont non commerciaux.
Aucun paiement financier ne peut être exigé ou proposé.
3.2 Réciprocité
Les échanges reposent sur un principe d’équité :
• 	un service rendu peut être compensé par un autre service,
• 	ou par un temps équivalent, selon les modalités convenues entre les utilisateurs.
3.3 Liberté contractuelle
Les utilisateurs sont libres de :
• 	choisir leurs partenaires d’échange,
• 	définir les modalités de l’échange,
• 	refuser un échange sans justification.

4. Engagements des Utilisateurs
4.1 Respect et courtoisie
Chaque utilisateur s’engage à adopter un comportement respectueux, bienveillant et non discriminatoire.
4.2 Exactitude des informations
Les utilisateurs doivent fournir des informations sincères concernant :
• 	leurs compétences,
• 	leur disponibilité,
• 	leur identité.
4.3 Sécurité
Les utilisateurs doivent veiller à leur propre sécurité et ne pas proposer :
• 	de services illégaux,
• 	de services dangereux,
• 	de services nécessitant une qualification professionnelle réglementée (ex : médecine, droit, électricité haute tension).

5. Responsabilités
5.1 Responsabilité de l’éditeur
Le site Bourse du Temps :
• 	n’intervient pas dans les échanges,
• 	ne garantit pas la qualité des services,
• 	ne peut être tenu responsable des litiges entre utilisateurs.
5.2 Responsabilité des utilisateurs
Les utilisateurs sont seuls responsables :
• 	des engagements qu’ils prennent,
• 	de la qualité des services rendus,
• 	des conséquences de leurs actions.

6. Confidentialité et Données
Les échanges doivent respecter la vie privée de chacun.
Aucune donnée personnelle obtenue dans le cadre d’un échange ne peut être :
• 	divulguée,
• 	vendue,
• 	utilisée à des fins commerciales.

7. Annulation et Litiges
7.1 Annulation
Un utilisateur peut annuler un échange, mais doit prévenir l’autre partie dans un délai raisonnable.
7.2 Litiges
En cas de désaccord, les utilisateurs doivent tenter une résolution amiable.
Le site n’intervient pas dans les conflits.

8. Interdictions
Il est strictement interdit de :
• 	proposer des services illégaux,
• 	exiger une rémunération financière,
• 	usurper l’identité d’un tiers,
• 	harceler ou menacer un autre utilisateur,
• 	détourner le site à des fins commerciales.

9. Suspension ou Exclusion
L’éditeur du site se réserve le droit de suspendre ou supprimer l’accès d’un utilisateur en cas de :
• 	non‑respect de la Loi,
• 	comportement dangereux,
• 	fraude ou tentative de fraude.

10. Modification de la Loi
La présente Loi peut être modifiée à tout moment.
La version en vigueur est celle publiée sur le site.

11. Acceptation
L’utilisation du site implique l’acceptation pleine et entière de la présente Loi de Conditions d’Échange.

CHARTE ÉTHIQUE – BOURSE DU TEMPS
Préambule
La communauté Bourse du Temps repose sur un principe simple : chacun possède du temps, des talents et des compétences qui peuvent bénéficier aux autres.
 Cette Charte Éthique établit les valeurs fondamentales qui guident les échanges entre les membres.
 En utilisant le site, chaque utilisateur s’engage à respecter ces principes.
1. Respect et Bienveillance
Chaque membre s’engage à :
traiter les autres avec courtoisie et respect
adopter une attitude positive et non discriminatoire
écouter, comprendre et communiquer de manière constructive
*Aucun comportement agressif, humiliant ou irrespectueux n’est toléré.
2. Confiance et Transparence
La confiance est la base de tout échange.
 Les utilisateurs doivent :
fournir des informations sincères sur leurs compétences et disponibilités
respecter les engagements pris
prévenir en cas d’imprévu ou d’annulation
*La transparence renforce la qualité des échanges.
3. Équité et Réciprocité
Les échanges doivent être :
équitables
équilibrés
basés sur la réciprocité
*Chaque service rendu doit être compensé par un autre service ou un temps équivalent, selon les modalités convenues librement entre les utilisateurs.
4. Gratuité des Échanges
La Bourse du Temps repose sur un principe fondamental :
aucune transaction financière n’est autorisée
aucun utilisateur ne peut exiger ou proposer une rémunération en argent
*Les échanges sont basés uniquement sur le temps, l’entraide et la solidarité.
5. Sécurité et Responsabilité
Chaque utilisateur doit :
veiller à sa propre sécurité
ne proposer que des services qu’il maîtrise réellement
ne pas s’engager dans des activités dangereuses ou illégales
*Les services nécessitant une qualification professionnelle réglementée (médecine, droit, travaux électriques complexes, etc.) sont interdits.
6. Confidentialité et Respect de la Vie Privée
Les informations échangées entre utilisateurs doivent rester confidentielles.
 Il est strictement interdit de :
divulguer des données personnelles
enregistrer ou publier des échanges sans consentement
utiliser les informations obtenues à des fins commerciales ou malveillantes
*La confiance passe par la discrétion.
7. Inclusion et Non‑Discrimination
La communauté est ouverte à tous, sans distinction de :
sexe
âge
origine
religion
situation sociale
handicap
*Toute forme de discrimination est strictement interdite.
8. Engagement envers la Qualité
Chaque utilisateur s’engage à :
fournir un service de qualité
respecter les délais convenus
faire preuve de sérieux et de professionnalisme
*Un échange réussi renforce la communauté.
9. Résolution des Conflits
En cas de désaccord, les utilisateurs doivent :
privilégier le dialogue
rechercher une solution amiable
faire preuve de compréhension
*Le site n’intervient pas dans les litiges, mais encourage la communication respectueuse.
10. Contribution à la Communauté
Chaque membre contribue à faire de Bourse du Temps un espace :
utile
solidaire
respectueux
enrichissant pour tous
*L’esprit d’entraide est au cœur du projet.
11. Acceptation de la Charte
L’utilisation du site implique l’acceptation pleine et entière de la présente Charte Éthique.
 Tout manquement peut entraîner une suspension ou une exclusion de la plateforme.`;

const INITIAL_BLOGS: BlogPost[] = [
  { 
    id: '1', 
    authorId: 'admin',
    authorName: 'Admin', 
    authorAvatar: 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg',
    title: 'Échange de compétences en cours !', 
    content: 'Une superbe session de partage aujourd\'hui au campus. L\'entraide est au cœur de notre communauté.', 
    category: 'Succès', 
    media: [{ type: 'image', url: 'https://i.postimg.cc/47b9W4tg/IMG-20260110-WA0161.jpg' }],
    likes: [],
    dislikes: [],
    shares: 0,
    reposts: 0,
    comments: [],
    createdAt: new Date().toISOString() 
  },
  { 
    id: '2', 
    authorId: 'admin',
    authorName: 'Admin', 
    authorAvatar: 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg',
    title: 'Moment de convivialité à Senghor', 
    content: 'Les échanges ne sont pas que techniques, ils sont aussi humains.', 
    category: 'Expérience', 
    media: [{ type: 'image', url: 'https://i.postimg.cc/2V31Z7HL/IMG-20260123-WA0248.jpg' }],
    likes: [],
    dislikes: [],
    shares: 0,
    reposts: 0,
    comments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString() 
  },
  { 
    id: '3', 
    authorId: 'admin',
    authorName: 'Admin', 
    authorAvatar: 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg',
    title: 'Nouveau projet collaboratif', 
    content: 'Découvrez comment nos membres s\'organisent pour de nouveaux défis.', 
    category: 'Actualité', 
    media: [{ type: 'image', url: 'https://i.postimg.cc/23ykc8nP/IMG-20260122-WA0308.jpg' }],
    likes: [],
    dislikes: [],
    shares: 0,
    reposts: 0,
    comments: [],
    createdAt: new Date(Date.now() - 172800000).toISOString() 
  },
  { 
    id: '4', 
    authorId: 'admin',
    authorName: 'Admin', 
    authorAvatar: 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg',
    title: 'Atelier pratique', 
    content: 'Apprendre les uns des autres, c\'est progresser ensemble.', 
    category: 'Tutoriel', 
    media: [{ type: 'image', url: 'https://i.postimg.cc/f3MtJn1w/IMG-20251229-WA0014.jpg' }],
    likes: [],
    dislikes: [],
    shares: 0,
    reposts: 0,
    comments: [],
    createdAt: new Date(Date.now() - 259200000).toISOString() 
  },
  { 
    id: '5', 
    authorId: 'admin',
    authorName: 'Admin', 
    authorAvatar: 'https://i.postimg.cc/5Y3Rg6zs/image-1.jpg',
    title: 'Rétrospective de fin d\'année', 
    content: 'Un grand merci à tous ceux qui ont contribué à faire vivre la Bourse du Temps.', 
    category: 'Succès', 
    media: [{ type: 'image', url: 'https://i.postimg.cc/sBnXxBpM/IMG-20251231-WA0144.jpg' }],
    likes: [],
    dislikes: [],
    shares: 0,
    reposts: 0,
    comments: [],
    createdAt: new Date(Date.now() - 345600000).toISOString() 
  }
];

const INITIAL_TESTIMONIALS: Testimonial[] = [];

const App: React.FC = () => {
  // Detect initial page from URL (for social share redirects)
  const getInitialPage = (): Page => {
    const path = window.location.pathname.replace('/', '').split('/')[0];
    const validPages: Page[] = ['home', 'about', 'services', 'requests', 'members', 'forum', 'blog', 'testimonials', 'profile', 'moderation', 'messages'];
    return validPages.includes(path as Page) ? (path as Page) || 'home' : 'home';
  };

  const [currentPage, setCurrentPageState] = useState<Page>(getInitialPage);

  const setCurrentPage = (page: Page, extra?: any) => {
    window.history.pushState({ page, ...extra }, '', '/' + (page === 'home' ? '' : page));
    setCurrentPageState(page);
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const page = (e.state?.page as Page) || 'home';
      if (e.state?.viewingUserId) setViewingUserId(e.state.viewingUserId);
      setCurrentPageState(page);
    };
    // Only replace state if we're on home, preserve other pages
    const initialPage = getInitialPage();
    window.history.replaceState({ page: initialPage }, '', initialPage === 'home' ? '/' : '/' + initialPage);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread messages count
  React.useEffect(() => {
    const fetchUnread = async () => {
      if (!localStorage.getItem('token')) return;
      try {
        const res = await fetch('/api/messages/unread', {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        if (res.ok) {
          const data = await res.json();
          const total = Object.values(data).reduce((a: any, b: any) => a + b, 0) as number;
          setUnreadMessages(total);
        }
      } catch(e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    totalVisitors: visitorCount,
    activeMembers: users.filter(u => u.status === 'active').length,
    offlineMembers: users.filter(u => u.status !== 'active').length,
    exchangesInProgress: [...services, ...requests].filter(e => e.status === 'in-progress').length,
    exchangesProposed: [...services, ...requests].filter(e => e.status === 'proposed').length,
    exchangesAccepted: [...services, ...requests].filter(e => e.status === 'accepted').length,
  };

  const [showAuthModal, setShowAuthModal] = useState<'login' | 'signup' | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const storedVisitors = localStorage.getItem('stb_visitors');
    const currentVisitors = storedVisitors ? parseInt(storedVisitors) : 0;
    const newVisitors = currentVisitors + 1;
    setVisitorCount(newVisitors);
    localStorage.setItem('stb_visitors', newVisitors.toString());
  }, []);

  const handleUpdateExchangeStatus = async (type: 'service' | 'request', id: string, newStatus: 'accepted' | 'cancelled' | 'in-progress', partnerId?: string) => {
    if (!user) return;
    const collectionName = type === 'service' ? 'services' : 'requests';
    const updateData: any = { 
      status: newStatus,
      updatedAt: serverTimestamp()
    };
    if (newStatus === 'accepted' && partnerId) {
      if (type === 'service') {
        updateData.acceptedBy = partnerId;
        updateData.acceptedAt = serverTimestamp();
      } else {
        updateData.fulfilledBy = partnerId;
        updateData.fulfilledAt = serverTimestamp();
      }
    }
    await updateDoc(doc(db, collectionName, id), updateData);
  };

  // Formulaire d'aide
  const [helpType, setHelpType] = useState<'Aide' | 'Signalement'>('Aide');
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpEmail, setHelpEmail] = useState('');
  const [helpPhone, setHelpPhone] = useState('');

  useEffect(() => {
    // Auth Listener
    let unsubUsers = () => {};
    let unsubConnections = () => {};
    let unsubTransactions = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
        
        // Subscribe to protected collections only when authenticated
        unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          setUsers(snapshot.docs.map(doc => doc.data() as User));
        }, (error) => console.error("Users snapshot error:", error));

        unsubConnections = onSnapshot(collection(db, 'connections'), (snapshot) => {
          setConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Connection)));
        }, (error) => console.error("Connections snapshot error:", error));

        unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')), (snapshot) => {
          setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        }, (error) => console.error("Transactions snapshot error:", error));

      } else {
        setUser(null);
        setUsers([]);
        setConnections([]);
        setTransactions([]);
        unsubUsers();
        unsubConnections();
        unsubTransactions();
      }
    });

    // Public collections
    const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('createdAt', 'desc')), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => console.error("Services snapshot error:", error));

    const unsubRequests = onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc')), (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request)));
    }, (error) => console.error("Requests snapshot error:", error));

    const unsubBlogs = onSnapshot(query(collection(db, 'blogs'), orderBy('createdAt', 'desc')), (snapshot) => {
      setBlogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
    }, (error) => console.error("Blogs snapshot error:", error));

    const unsubTestimonials = onSnapshot(query(collection(db, 'testimonials'), orderBy('createdAt', 'desc')), (snapshot) => {
      setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial)));
    }, (error) => console.error("Testimonials snapshot error:", error));

    const unsubForum = onSnapshot(query(collection(db, 'forumTopics'), orderBy('createdAt', 'desc')), (snapshot) => {
      setForumTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ForumTopic)));
    }, (error) => console.error("Forum snapshot error:", error));

    return () => {
      unsubscribeAuth();
      unsubUsers();
      unsubServices();
      unsubRequests();
      unsubBlogs();
      unsubTestimonials();
      unsubConnections();
      unsubTransactions();
      unsubForum();
    };
  }, []);

  const sendNotification = async (endpoint: string, data: any) => {
    try {
      await fetch('/api/notify/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch(e) { console.error('Notification error:', e); }
  };

  const handleAuth = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(null);
  };

  const handleTransaction = async (item: Service | Request, negotiatedAmount: number, type: 'service' | 'request') => {
    if (!user) { setShowAuthModal('login'); return; }
    
    const buyerId = type === 'service' ? user.uid : item.userId;
    const providerId = type === 'service' ? item.userId : user.uid;
    
    const buyer = users.find(u => u.uid === buyerId);
    const provider = users.find(u => u.uid === providerId);

    if (!buyer || buyer.credits < negotiatedAmount) {
      alert("Erreur : Crédits insuffisants.");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', buyerId), { credits: buyer.credits - negotiatedAmount });
      await updateDoc(doc(db, 'users', providerId), { credits: (provider?.credits || 0) + negotiatedAmount });

      await addDoc(collection(db, 'transactions'), {
        fromId: buyerId,
        toId: providerId,
        amount: negotiatedAmount,
        serviceTitle: item.title,
        type: type,
        createdAt: new Date().toISOString()
      });

      if (provider) sendNotification('exchange', {
        targetEmail: provider.email,
        targetName: provider.firstName + ' ' + provider.lastName,
        fromName: user.firstName + ' ' + user.lastName,
        title: item.title,
        type
      });
      alert(`Succès ! ${negotiatedAmount} crédits ont été transférés.`);
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue lors de la transaction.");
    }
  };

  const handleSendConnection = async (targetUid: string) => {
    if (!user) { setShowAuthModal('login'); return; }
    try {
      const res = await addDoc(collection(db, 'connections'), {
        senderId: user.uid,
        receiverId: targetUid,
        status: 'sent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      // Mise à jour immédiate du state
      const newConn = { id: res.id, senderId: user.uid, receiverId: targetUid, status: 'sent', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setConnections(prev => [...prev, newConn]);
      const target = users.find(u => u.uid === targetUid);
      if (target) sendNotification('connection', {
        receiverEmail: target.email,
        receiverName: target.firstName + ' ' + target.lastName,
        senderName: user.firstName + ' ' + user.lastName
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateConnection = async (connectionId: string, newStatus: 'accepted' | 'refused' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'connections', connectionId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      if (newStatus === 'accepted' && user) {
        const conn = connections.find(c => c.id === connectionId);
        if (conn) {
          const sender = users.find(u => u.uid === conn.senderId);
          if (sender) sendNotification('connection-accepted', {
            receiverEmail: sender.email,
            receiverName: sender.firstName + ' ' + sender.lastName,
            accepterName: user.firstName + ' ' + user.lastName
          });
        }
      }
      if (newStatus === 'cancelled' || newStatus === 'refused') {
        setConnections(prev => prev.filter(c => c.id !== connectionId));
      } else {
        setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: newStatus } : c));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleHelpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: helpType, subject: helpSubject, message: helpMessage, email: helpEmail, phone: helpPhone })
      });
      if (res.ok) {
        alert('Merci ! Votre demande a été transmise à l\'administrateur.');
        setShowHelpModal(false);
        setHelpSubject('');
        setHelpMessage('');
        setHelpEmail('');
        setHelpPhone('');
      } else { alert('Erreur lors de l\'envoi. Réessayez.'); }
    } catch { alert('Erreur réseau. Réessayez.'); }
    setShowHelpModal(false);
    setHelpSubject('');
    setHelpMessage('');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    try {
      await updateDoc(doc(db, 'users', updatedUser.uid), { ...updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { status: 'deactivated' });
    await auth.signOut();
    setUser(null);
    setCurrentPage('home');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { status: 'deleted' });
    // In a real app, we might also delete their auth account or scrub PII
    await auth.signOut();
    setUser(null);
    setCurrentPage('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home navigate={setCurrentPage} blogs={blogs} testimonials={testimonials} stats={stats} />;
      case 'about': return <About />;
      case 'services': return <ServicesPage user={user} services={services} onUpdate={setServices} onBuy={(s, amt) => handleTransaction(s, amt, 'service')} onUpdateStatus={handleUpdateExchangeStatus} />;
      case 'requests': return <RequestsPage user={user} requests={requests} onUpdate={setRequests} onFulfill={(r, amt) => handleTransaction(r, amt, 'request')} onUpdateStatus={handleUpdateExchangeStatus} />;
      case 'members': return <Members users={users} onViewProfile={(uid) => { setViewingUserId(uid); setCurrentPage('profile-view', { viewingUserId: uid }); }} />;
      case 'forum': return <Forum user={user} topics={forumTopics} onAdd={(t) => setForumTopics([t, ...forumTopics])} />;
      case 'blog': return <Blog blogs={blogs} onUpdate={(b) => { setBlogs(b); localStorage.setItem('stb_blogs', JSON.stringify(b)); }} user={user} onAuthClick={() => setShowAuthModal('login')} />;
      case 'testimonials': return <Testimonials testimonials={testimonials} onUpdate={(t) => { setTestimonials(t); localStorage.setItem('stb_testimonials', JSON.stringify(t)); }} user={user} onAuthClick={() => setShowAuthModal('login')} />;
      case 'profile': return user ? <Profile user={user} allUsers={users} transactions={transactions} connections={connections} messages={messages} onUpdate={handleUpdateUser} onSendConnection={handleSendConnection} onUpdateConnection={handleUpdateConnection} onUpdateMessages={setMessages} onDeactivate={handleDeactivateAccount} onDelete={handleDeleteAccount} /> : <Home navigate={setCurrentPage} blogs={blogs} testimonials={testimonials} stats={stats} />;
      case 'profile-view': 
        const target = users.find(u => u.uid === viewingUserId);
        return target ? <Profile user={target} currentUser={user} allUsers={users} transactions={transactions} connections={connections} messages={messages} onUpdate={() => {}} onSendConnection={(uid) => { if (!user) { setShowAuthModal('login'); return; } handleSendConnection(uid); }} onUpdateConnection={handleUpdateConnection} onUpdateMessages={setMessages} readOnly /> : <Members users={users} onViewProfile={(uid) => { setViewingUserId(uid); setCurrentPage('profile-view'); }} />;
      case 'messages': return user ? <MessagesPage user={user} users={users} /> : <Home navigate={setCurrentPage} blogs={blogs} testimonials={testimonials} stats={stats} />;
      case 'moderation': return <Moderation users={users} onUpdateUsers={setUsers} services={services} onUpdateServices={setServices} requests={requests} onUpdateRequests={setRequests} currentUser={user!} />;
      default: return <Home navigate={setCurrentPage} blogs={blogs} testimonials={testimonials} stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar currentPage={currentPage} user={user} unreadMessages={unreadMessages} onNavigate={setCurrentPage} onLogin={() => setShowAuthModal('login')} onSignup={() => setShowAuthModal('signup')} onLogout={() => setUser(null)} />
      <main className="flex-grow pt-16">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }>
          {renderPage()}
        </Suspense>
      </main>
      
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src="https://i.postimg.cc/5Y3Rg6zs/image-1.jpg" className="w-14 h-14 rounded-full border-2 border-slate-700 shadow-lg object-cover" alt="Logo" />
              <h3 className="text-white font-heading font-bold text-xl uppercase tracking-wider">BOURSE DU TEMPS</h3>
            </div>
            <p className="text-sm leading-relaxed">
              La plateforme solidaire exclusive de l'Université Senghor. Échangez vos talents, valorisez votre temps.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest text-blue-400">Navigation</h4>
            <ul className="space-y-3 text-sm">
              <li onClick={() => setCurrentPage('home')} className="cursor-pointer hover:text-white transition">Accueil</li>
              <li onClick={() => setCurrentPage('services')} className="cursor-pointer hover:text-white transition">Services</li>
              <li onClick={() => setCurrentPage('blog')} className="cursor-pointer hover:text-white transition">Blog interactif</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest text-blue-400">Support Admin</h4>
            <p className="text-sm mb-4">Besoin d'aide ou signalement ?</p>
            <button 
              onClick={() => setShowHelpModal(true)}
              className="text-sm text-white font-medium break-all hover:text-blue-400 transition underline decoration-blue-500 underline-offset-4 text-left"
            >
              {ADMIN_EMAIL}
            </button>
          </div>

          <div className="flex flex-col items-center md:items-end gap-6">
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-200">
              <img src="https://i.postimg.cc/z31ChCWm/logo-35-ans-usenghor-signature-1.png" className="h-24 w-auto object-contain" alt="35 ans" />
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest text-center md:text-right">Partenaire de l'excellence en Francophonie</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest">
          <p>© {new Date().getFullYear()} Université Senghor - Alexandrie. Tous droits réservés.</p>
          <div className="flex gap-6">
            <span 
              className="hover:text-white cursor-pointer underline decoration-blue-500 underline-offset-4"
              onClick={() => setShowPrivacyModal(true)}
            >
              Confidentialité
            </span>
            <span 
              className="hover:text-white cursor-pointer underline decoration-blue-500 underline-offset-4"
              onClick={() => setShowTermsModal(true)}
            >
              Conditions d'échange
            </span>
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal mode={showAuthModal} onClose={() => setShowAuthModal(null)} onAuth={handleAuth} onSwitch={setShowAuthModal} />
      )}

      {/* MODALE D'AIDE ET SIGNALEMENT */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowHelpModal(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Assistance</h2>
            <p className="text-slate-500 text-sm mb-8">Envoyez directement votre message à l'administration.</p>
            
            <form onSubmit={handleHelpSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nature de la demande</label>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setHelpType('Aide')}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition ${helpType === 'Aide' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    Aide technique
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setHelpType('Signalement')}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition ${helpType === 'Signalement' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    Signalement
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Votre Email</label>
                <input required type="email" placeholder="votre@email.com" className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={helpEmail} onChange={e => setHelpEmail(e.target.value)} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Votre Numéro WhatsApp</label>
                <input required type="tel" placeholder="+221..." className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={helpPhone} onChange={e => setHelpPhone(e.target.value)} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Objet</label>
                <input 
                  required 
                  placeholder="Ex: Problème de connexion, Litige..." 
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" 
                  value={helpSubject}
                  onChange={e => setHelpSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Votre message</label>
                <textarea 
                  required 
                  placeholder="Détaillez votre demande ici..." 
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]" 
                  value={helpMessage}
                  onChange={e => setHelpMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition">
                  Envoyer
                </button>
                <button type="button" onClick={() => setShowHelpModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-bold">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DES CONDITIONS D'ÉCHANGE */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[2rem] p-8 md:p-12 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-2xl font-bold text-slate-900 uppercase tracking-tight">Règlement & Charte</h2>
              <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto pr-4 custom-scrollbar">
              <div className="prose prose-slate max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed text-sm md:text-base">
                  {TERMS_TEXT}
                </pre>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowTermsModal(false)}
                className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                J'ai lu et compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIDENTIALITÉ */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowPrivacyModal(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[2rem] p-8 md:p-12 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-2xl font-bold text-slate-900 uppercase tracking-tight">Confidentialité & Mentions Légales</h2>
              <button onClick={() => setShowPrivacyModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto pr-4 custom-scrollbar">
              <div className="prose prose-slate max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed text-sm md:text-base">
                  {PRIVACY_TEXT}
                </pre>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
