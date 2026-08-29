// =====================================================
// SCRIPT.JS
// CEAI — Connaissance Entre Amis Intimes
// Connexion Supabase, authentification, menu et navigation.
// =====================================================

// --- CONNEXION SUPABASE ---
// La cle utilisee ici est la "Publishable key" : elle est
// concue pour etre publique. La veritable protection des
// donnees est assuree par les regles de securite (RLS)
// definies directement dans la base de donnees.
const SUPABASE_URL = "https://sgghvlvwwprhvtsvuveg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_w_2_Ndw0ZJAj-bVeXZgIzw_Y09wTTps";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

document.addEventListener("DOMContentLoaded", () => {

  // =====================================================
  // ELEMENTS
  // =====================================================
  const authScreen = document.getElementById("authScreen");
  const sitePrincipal = document.getElementById("sitePrincipal");

  const connexionForm = document.getElementById("connexionForm");
  const inscriptionForm = document.getElementById("inscriptionForm");
  const authTitre = document.getElementById("authTitre");

  const lienInscription = document.getElementById("lienInscription");
  const lienConnexion = document.getElementById("lienConnexion");
  const lienDeconnexion = document.getElementById("lienDeconnexion");

  const btnConnexion = document.getElementById("btnConnexion");
  const btnInscription = document.getElementById("btnInscription");

  const btnToggleMenu = document.getElementById("btnToggleMenu");
  const optionsMenu = document.getElementById("optionsMenu");

  // =====================================================
  // AUTHENTIFICATION — BASCULER ENTRE LES FORMULAIRES
  // =====================================================
  lienInscription.addEventListener("click", (e) => {
    e.preventDefault();
    connexionForm.classList.add("cache");
    inscriptionForm.classList.remove("cache");
    authTitre.textContent = "Inscription";
  });

  lienConnexion.addEventListener("click", (e) => {
    e.preventDefault();
    inscriptionForm.classList.add("cache");
    connexionForm.classList.remove("cache");
    authTitre.textContent = "Connexion";
  });

  // =====================================================
  // AFFICHER / MASQUER LE MOT DE PASSE
  // =====================================================
  function activerToggleMotDePasse(idBouton, idChamp) {
    const bouton = document.getElementById(idBouton);
    const champ = document.getElementById(idChamp);

    bouton.addEventListener("click", () => {
      const estVisible = champ.type === "text";
      champ.type = estVisible ? "password" : "text";
      bouton.setAttribute("aria-label", estVisible ? "Afficher le mot de passe" : "Masquer le mot de passe");
      bouton.classList.toggle("actif", !estVisible);
    });
  }

  activerToggleMotDePasse("btnOeilConnexion", "connMdp");
  activerToggleMotDePasse("btnOeilInscription", "inscMdp");

  // =====================================================
  // INSCRIPTION
  // =====================================================
  // La fiche membre est desormais creee automatiquement par
  // la base de donnees (voir trigger_nouveau_membre.sql).
  // Le site se contente d'envoyer le nom dans les metadonnees
  // du compte, que le trigger recupere de son cote.
  btnInscription.addEventListener("click", async () => {
    const nom = document.getElementById("inscNom").value.trim();
    const email = document.getElementById("inscEmail").value.trim();
    const mdp = document.getElementById("inscMdp").value;
    const erreur = document.getElementById("inscErreur");
    erreur.textContent = "";
    erreur.style.color = "";

    if (!nom || !email || mdp.length < 6) {
      erreur.textContent = "Remplissez tous les champs (6 caractères minimum pour le mot de passe)";
      return;
    }

    const { error } = await supabaseClient.auth.signUp({
      email,
      password: mdp,
      options: {
        data: { nom: nom }
      }
    });

    if (error) {
      erreur.textContent = traduireErreurAuth(error.message);
      return;
    }

    erreur.style.color = "#16a34a";
    erreur.textContent = "Compte créé avec succès. Connexion en cours...";
  });

  // =====================================================
  // CONNEXION
  // =====================================================
  btnConnexion.addEventListener("click", async () => {
    const email = document.getElementById("connEmail").value.trim();
    const mdp = document.getElementById("connMdp").value;
    const erreur = document.getElementById("authErreur");
    erreur.textContent = "";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: mdp
    });

    if (error) {
      erreur.textContent = traduireErreurAuth(error.message);
    }
  });

  // =====================================================
  // DECONNEXION
  // =====================================================
  lienDeconnexion.addEventListener("click", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
  });

    // =====================================================
  // PROFIL DU MEMBRE CONNECTE
  // =====================================================
  // Variable accessible dans tout le fichier : contient la
  // fiche du membre actuellement connecte (nom, role, modes).
  window.membreCourant = null;

  async function chargerProfilMembre(idCompte) {
    const { data, error } = await supabaseClient
      .from("membres")
      .select("*")
      .eq("compte_id", idCompte)
      .single();

    if (error) {
      console.error("Impossible de charger le profil du membre :", error.message);
      return;
    }

    window.membreCourant = data;
    mettreAJourVisibiliteAdmin();
  }

  function mettreAJourVisibiliteAdmin() {
    const estAdmin = window.membreCourant && window.membreCourant.role === "admin";
    document.querySelectorAll(".zone-admin").forEach((element) => {
      element.classList.toggle("cache", !estAdmin);
    });
  }

  // =====================================================
  // SURVEILLER L'ETAT DE CONNEXION
  // =====================================================
  supabaseClient.auth.onAuthStateChange((evenement, session) => {
    if (session) {
      authScreen.classList.add("cache");
      sitePrincipal.classList.remove("cache");
      chargerProfilMembre(session.user.id);
    } else {
      authScreen.classList.remove("cache");
      sitePrincipal.classList.add("cache");
      window.membreCourant = null;
    }
  });

  // =====================================================
  // TRADUCTION DES MESSAGES D'ERREUR SUPABASE
  // =====================================================
  function traduireErreurAuth(message) {
    const correspondances = {
      "Invalid login credentials": "Email ou mot de passe incorrect",
      "User already registered": "Cet email est déjà utilisé",
      "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères",
      "Unable to validate email address: invalid format": "Adresse email invalide",
      "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter"
    };
    return correspondances[message] || "Une erreur est survenue : " + message;
  }

  // =====================================================
  // MENU PRINCIPAL — OUVERTURE
  // =====================================================
  btnToggleMenu.addEventListener("click", () => {
    const ouvert = optionsMenu.classList.toggle("ouvert");
    btnToggleMenu.setAttribute("aria-expanded", ouvert ? "true" : "false");
  });

  // =====================================================
  // MENU — COMPORTEMENT ACCORDEON (COTISATION / TONTINE)
  // =====================================================
  document.querySelectorAll(".menu-accordeon").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const cible = document.getElementById(bouton.dataset.cible);
      const estOuvert = cible.classList.contains("ouvert");

      cible.classList.toggle("ouvert", !estOuvert);
      bouton.setAttribute("aria-expanded", !estOuvert ? "true" : "false");
    });
  });

  // =====================================================
  // NAVIGATION ENTRE SECTIONS
  // =====================================================
  document.querySelectorAll(".lien-menu[data-section]").forEach((lien) => {
    lien.addEventListener("click", (evenement) => {
      evenement.preventDefault();
      afficherSection(lien.dataset.section);
      optionsMenu.classList.remove("ouvert");
      btnToggleMenu.setAttribute("aria-expanded", "false");
    });
  });

  function afficherSection(nom) {
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    const section = document.getElementById("sec-" + nom);
    if (section) section.classList.add("active");
  }

  // =====================================================
  // ESPACE ADMINISTRATEUR — NAVIGATION ENTRE ONGLETS
  // =====================================================
  document.querySelectorAll(".onglet-admin").forEach((onglet) => {
    onglet.addEventListener("click", () => {
      document.querySelectorAll(".onglet-admin").forEach((o) => o.classList.remove("actif"));
      document.querySelectorAll(".panneau-admin").forEach((p) => p.classList.remove("actif"));

      onglet.classList.add("actif");
      document.getElementById("panneau-" + onglet.dataset.onglet).classList.add("actif");
    });
  });

});
