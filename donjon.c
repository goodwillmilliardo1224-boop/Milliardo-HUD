#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ================================================================
   PLATE-FORME
   ================================================================ */
#ifdef _WIN32
    #include <windows.h>
    #include <conio.h>
    #include <io.h>
    #define PAUSE_MS(ms)   Sleep(ms)
    #define attendre(ms)   Sleep(ms)
    static int  touche_pressee(void)  { return _kbhit(); }
    static char lire_touche(void)     { return (char)_getch(); }
    static void cacher_curseur(void){
        HANDLE h=GetStdHandle(STD_OUTPUT_HANDLE);
        CONSOLE_CURSOR_INFO ci={1,FALSE}; SetConsoleCursorInfo(h,&ci);
    }
    static void montrer_curseur(void){
        HANDLE h=GetStdHandle(STD_OUTPUT_HANDLE);
        CONSOLE_CURSOR_INFO ci={1,TRUE}; SetConsoleCursorInfo(h,&ci);
    }
    static void aller_position(int colonne, int ligne){
        COORD c={(SHORT)(colonne-1),(SHORT)(ligne-1)};
        SetConsoleCursorPosition(GetStdHandle(STD_OUTPUT_HANDLE),c);
    }
    #include <process.h>
    typedef HANDLE           FilExecution;
    typedef CRITICAL_SECTION Verrou;
    #define TYPE_FIL   DWORD WINAPI
    #define ARG_FIL    LPVOID
    #define RETOUR_FIL 0
    static FilExecution demarrer_fil(LPTHREAD_START_ROUTINE fn, void *argument){
        return CreateThread(NULL,0,fn,argument,0,NULL);
    }
    static void attendre_fil(FilExecution h){WaitForSingleObject(h,INFINITE);CloseHandle(h);}
    static void initialiser_verrou(Verrou *v)  {InitializeCriticalSection(v);}
    static void verrouiller(Verrou *v)          {EnterCriticalSection(v);}
    static void deverrouiller(Verrou *v)        {LeaveCriticalSection(v);}
    static void detruire_verrou(Verrou *v)      {DeleteCriticalSection(v);}
    static void effacer_lignes_precedentes(int nb){
        HANDLE hC=GetStdHandle(STD_OUTPUT_HANDLE);
        CONSOLE_SCREEN_BUFFER_INFO csbi;
        if(!GetConsoleScreenBufferInfo(hC,&csbi))return;
        COORD pos=csbi.dwCursorPosition;
        for(int i=0;i<nb;i++){
            pos.Y--;
            SetConsoleCursorPosition(hC,pos);
            DWORD w;
            FillConsoleOutputCharacter(hC,' ',csbi.dwSize.X,pos,&w);
            FillConsoleOutputAttribute(hC,csbi.wAttributes,csbi.dwSize.X,pos,&w);
        }
        fflush(stdout);
    }
#else
    #include <unistd.h>
    #include <dirent.h>
    #include <termios.h>
    #include <sys/select.h>
    #include <pthread.h>
    #define PAUSE_MS(ms) usleep((ms)*1000)
    #define attendre(ms) usleep((ms)*1000)
    static struct termios sauvegarde_terminal;
    static void terminal_brut(void){
        struct termios t; tcgetattr(STDIN_FILENO,&sauvegarde_terminal); t=sauvegarde_terminal;
        t.c_lflag&=~(ICANON|ECHO); t.c_cc[VMIN]=0; t.c_cc[VTIME]=0;
        tcsetattr(STDIN_FILENO,TCSANOW,&t);
    }
    static void terminal_restaurer(void){tcsetattr(STDIN_FILENO,TCSANOW,&sauvegarde_terminal);}
    static int touche_pressee(void){
        struct timeval tv={0,0}; fd_set fds;
        FD_ZERO(&fds); FD_SET(STDIN_FILENO,&fds);
        return select(STDIN_FILENO+1,&fds,NULL,NULL,&tv)>0;
    }
    static char lire_touche(void){char c=0;read(STDIN_FILENO,&c,1);return c;}
    static void cacher_curseur(void) {printf("\033[?25l");fflush(stdout);}
    static void montrer_curseur(void){printf("\033[?25h");fflush(stdout);}
    static void aller_position(int colonne, int ligne){printf("\033[%d;%dH",ligne,colonne);}
    typedef pthread_t       FilExecution;
    typedef pthread_mutex_t Verrou;
    #define TYPE_FIL   void *
    #define ARG_FIL    void *
    #define RETOUR_FIL NULL
    static FilExecution demarrer_fil(void *(*fn)(void*), void *argument){
        pthread_t t; pthread_create(&t,NULL,fn,argument); return t;
    }
    static void attendre_fil(FilExecution h){pthread_join(h,NULL);}
    static void initialiser_verrou(Verrou *v)  {pthread_mutex_init(v,NULL);}
    static void verrouiller(Verrou *v)          {pthread_mutex_lock(v);}
    static void deverrouiller(Verrou *v)        {pthread_mutex_unlock(v);}
    static void detruire_verrou(Verrou *v)      {pthread_mutex_destroy(v);}
    static void effacer_lignes_precedentes(int nb){
        for(int i=0;i<nb;i++) printf("\033[1A\033[K");
        fflush(stdout);
    }
#endif

/* ================================================================
   COULEURS ANSI
   ================================================================ */
#define REINIT     "\033[0m"
#define ROUGE      "\033[1;31m"
#define VERT       "\033[1;32m"
#define JAUNE      "\033[1;33m"
#define BLEU       "\033[1;34m"
#define MAGENTA    "\033[1;35m"
#define CYAN       "\033[1;36m"
#define BLANC      "\033[1;37m"
#define GRIS       "\033[0;90m"
#define FOND_ROUGE "\033[41m"

/* ================================================================
   CONSTANTES
   ================================================================ */
#define MAX_LIGNES       81
#define MAX_COLONNES     121
#define MAX_ENNEMIS      40

#define MUR     '#'
#define VIDE    ' '
#define JOUEUR  '@'
#define ENNEMI  'E'
#define BOSS    'B'
#define CLE     'K'
#define SORTIE  'S'
#define MYSTERE '?'

#define RAYON_DETECTION  5
#define DUREE_TRAQUE_S   10
#define INTERVALLE_IA_MS 350
#define HUD_LIGNES       13

/* ================================================================
   STRUCTURES RPG
   ================================================================ */
typedef struct {
    char nom[30];
    int  degats;
    int  coutMana;
} Attaque;

typedef struct {
    char nom[30];
    int  quantite;
} Objet;

typedef struct {
    Objet potionVie;
    Objet potionMana;
} Inventaire;

/* ================================================================
   STRUCTURE ENNEMI
   ================================================================ */
typedef struct { int x, y; } Position;

typedef struct {
    Position position;
    int      vivant;
    int      est_boss;
    int      en_traque;
    time_t   debut_traque;
    char     nom[50];
    int      pv, pvMaximum;
    Attaque  capacites[4];
    int      niveau;
} Ennemi;

/* ================================================================
   STRUCTURE CARTE (contient aussi l'etat complet du joueur)
   ================================================================ */
typedef struct {
    /* --- Labyrinthe --- */
    char  grille[MAX_LIGNES][MAX_COLONNES];
    int   lignes, colonnes;
    Ennemi ennemis[MAX_ENNEMIS];
    int   nombre_ennemis;
    int   a_la_cle, boss_mort, sortie_ouverte;
    char  message[80];
    volatile int arreter;
    Verrou verrou;

    /* --- Joueur RPG --- */
    char       nom[50];
    int        pv,    pvMaximum;
    int        mana,  manaMaximum;
    int        xp,    xpMaximum;
    int        niveau;
    Attaque    capacites[4];
    Inventaire inventaire;
    Position   position_joueur;
} Carte;

/* ================================================================
   GENERATION ENNEMIS RPG
   ================================================================ */
static void configurer_ennemi(Ennemi *ennemi, int type_ennemi, int niveau_ennemi) {
    ennemi->niveau = niveau_ennemi;
    float multiplicateur = niveau_ennemi * 1.5f;

    switch(type_ennemi) {
        case 1:
            strcpy(ennemi->nom, "Gobelin");
            ennemi->pvMaximum = (int)(40 * multiplicateur);
            strcpy(ennemi->capacites[0].nom, "Coup de gourdin"); ennemi->capacites[0].degats = (int)(8  * multiplicateur);
            strcpy(ennemi->capacites[1].nom, "Jet de pierre");   ennemi->capacites[1].degats = (int)(6  * multiplicateur);
            strcpy(ennemi->capacites[2].nom, "Morsure");         ennemi->capacites[2].degats = (int)(10 * multiplicateur);
            break;
        case 2:
            strcpy(ennemi->nom, "Slime");
            ennemi->pvMaximum = (int)(25 * multiplicateur);
            strcpy(ennemi->capacites[0].nom, "Ecrasement");      ennemi->capacites[0].degats = (int)(5  * multiplicateur);
            strcpy(ennemi->capacites[1].nom, "Charge gluante");  ennemi->capacites[1].degats = (int)(7  * multiplicateur);
            strcpy(ennemi->capacites[2].nom, "Explosion acide"); ennemi->capacites[2].degats = (int)(12 * multiplicateur);
            break;
        case 100:
            strcpy(ennemi->nom, "--- ROI SQUELETTE ---");
            ennemi->pvMaximum = (int)(50 * multiplicateur);
            strcpy(ennemi->capacites[0].nom, "Tranchant d'os");  ennemi->capacites[0].degats = (int)(10 * multiplicateur);
            strcpy(ennemi->capacites[1].nom, "Pluie de cranes"); ennemi->capacites[1].degats = (int)(15 * multiplicateur);
            strcpy(ennemi->capacites[2].nom, "Coup de faux");    ennemi->capacites[2].degats = (int)(20 * multiplicateur);
            break;
        default:
            strcpy(ennemi->nom, "Inconnu");
            ennemi->pvMaximum = 50;
            strcpy(ennemi->capacites[0].nom, "Attaque");  ennemi->capacites[0].degats = 10;
            strcpy(ennemi->capacites[1].nom, "Charge");   ennemi->capacites[1].degats = 8;
            strcpy(ennemi->capacites[2].nom, "Coup");     ennemi->capacites[2].degats = 12;
            break;
    }
    strcpy(ennemi->capacites[3].nom, "Bouclier d'Energie");
    ennemi->capacites[3].degats = (int)(10 * multiplicateur);
    for (int i = 0; i < 4; i++) ennemi->capacites[i].coutMana = 0;
    ennemi->pv = ennemi->pvMaximum;
}

/* ================================================================
   UTILITAIRES COMMUNS
   ================================================================ */
static int valeur_absolue(int v){ return v < 0 ? -v : v; }
static int distance_manhattan(Position a, Position b){ return valeur_absolue(a.x-b.x) + valeur_absolue(a.y-b.y); }
static int hauteur_carte(int niveau){ int v=15+niveau*4; if(v%2==0)v++; if(v>MAX_LIGNES)v=MAX_LIGNES; return v; }
static int largeur_carte(int niveau){ int v=25+niveau*6; if(v%2==0)v++; if(v>MAX_COLONNES)v=MAX_COLONNES; return v; }
static int quota_ennemis(int niveau) { return 3+niveau*2; }
static int quota_objets(int niveau)  { return 4+niveau; }

static void vider_ecran(void) {
#ifdef _WIN32
    system("cls");
#else
    printf("\033[2J\033[H");
#endif
}

static void barre_progression(char *sortie_barre, int valeur, int maximum, int largeur) {
    int cases_remplies = (maximum > 0) ? (valeur * largeur / maximum) : 0;
    if (cases_remplies < 0) cases_remplies = 0;
    if (cases_remplies > largeur) cases_remplies = largeur;
    int position = 0;
    sortie_barre[position++] = '[';
    for (int i = 0; i < largeur; i++) sortie_barre[position++] = (i < cases_remplies ? '=' : '-');
    sortie_barre[position++] = ']';
    sortie_barre[position] = '\0';
}

static int lire_entier(const char *invitation, int min, int max) {
    char tampon[128]; char *fin_lecture; long valeur_lue;
    while (1) {
        printf("%s", invitation); fflush(stdout);
        if (!fgets(tampon, sizeof(tampon), stdin)) return min;
        valeur_lue = strtol(tampon, &fin_lecture, 10);
        if (fin_lecture == tampon || (*fin_lecture != '\n' && *fin_lecture != '\0')) {
            printf("Entree invalide. Veuillez saisir un nombre.\n"); continue;
        }
        if (valeur_lue < min || valeur_lue > max) {
            printf("Choix hors plage (%d-%d).\n", min, max); continue;
        }
        return (int)valeur_lue;
    }
}

static void lire_chaine(char *destination, int taille, const char *invitation) {
    char tampon[128];
    printf("%s", invitation); fflush(stdout);
    if (!fgets(tampon, sizeof(tampon), stdin)) { destination[0] = '\0'; return; }
    tampon[strcspn(tampon, "\r\n")] = '\0';
    strncpy(destination, tampon, taille - 1);
    destination[taille - 1] = '\0';
}

/* Prototypes des fonctions statiques */
static void initialiser_capacites_joueur(Carte *carte);
static void initialiser_inventaire(Carte *carte);

/* ================================================================
   SAUVEGARDE / CHARGEMENT
   ================================================================ */
static int sauvegarder(const Carte *carte) {
    char nom_fichier[60]; sprintf(nom_fichier, "%s.txt", carte->nom);
    FILE *fichier = fopen(nom_fichier, "w"); if (!fichier) return 0;
    fprintf(fichier, "%s %d %d %d %d %d %d %d %d %d %d\n",
        carte->nom, carte->pv, carte->pvMaximum, carte->mana, carte->manaMaximum,
        carte->xp, carte->xpMaximum, carte->niveau,
        carte->inventaire.potionVie.quantite, carte->inventaire.potionMana.quantite,
        carte->boss_mort);
    for (int i = 0; i < 4; i++)
        fprintf(fichier, "%d %d\n", carte->capacites[i].degats, carte->capacites[i].coutMana);
    fclose(fichier); return 1;
}

static int charger_dans_carte(Carte *carte, const char *nom_joueur) {
    char nom_fichier[60]; sprintf(nom_fichier, "%s.txt", nom_joueur);
    FILE *fichier = fopen(nom_fichier, "r"); if (!fichier) return 0;
    int boss_mort_sauvegarde = 0;
    fscanf(fichier, "%49s %d %d %d %d %d %d %d %d %d %d",
        carte->nom, &carte->pv, &carte->pvMaximum, &carte->mana, &carte->manaMaximum,
        &carte->xp, &carte->xpMaximum, &carte->niveau,
        &carte->inventaire.potionVie.quantite, &carte->inventaire.potionMana.quantite,
        &boss_mort_sauvegarde);
    for (int i = 0; i < 4; i++)
        fscanf(fichier, "%d %d", &carte->capacites[i].degats, &carte->capacites[i].coutMana);
    fclose(fichier);
    carte->boss_mort = boss_mort_sauvegarde;

    /* Restaurer les noms des objets et capacites */
    strcpy(carte->inventaire.potionVie.nom,  "Potion de vie");
    strcpy(carte->inventaire.potionMana.nom, "Potion de mana");
    initialiser_capacites_joueur(carte);

    return 1;
}

static void initialiser_capacites_joueur(Carte *carte) {
    float multiplicateur = carte->niveau * 1.0f;
    strcpy(carte->capacites[0].nom, "Epee tranchante"); carte->capacites[0].degats = (int)(15 * multiplicateur); carte->capacites[0].coutMana = 0;
    strcpy(carte->capacites[1].nom, "Boule de feu");    carte->capacites[1].degats = (int)(20 * multiplicateur); carte->capacites[1].coutMana = 10;
    strcpy(carte->capacites[2].nom, "Coup critique");   carte->capacites[2].degats = (int)(25 * multiplicateur); carte->capacites[2].coutMana = 15;
    strcpy(carte->capacites[3].nom, "Bouclier magique");carte->capacites[3].degats = (int)(12 * multiplicateur); carte->capacites[3].coutMana = 8;
}

static void initialiser_inventaire(Carte *carte) {
    strcpy(carte->inventaire.potionVie.nom,  "Potion de vie");
    carte->inventaire.potionVie.quantite  = 3;
    strcpy(carte->inventaire.potionMana.nom, "Potion de mana");
    carte->inventaire.potionMana.quantite = 2;
}

/* ================================================================
   INTERFACE COMBAT (boite ASCII tour par tour)
   ================================================================ */
static void dessiner_combat(const Carte *carte, const Ennemi *ennemi,
                            const char *msg1, const char *msg2) {
    char barre_affichage[30], ligne[128];
    vider_ecran();
    printf("╔═════════════════════════════════════════════════════════════════════╗\n");
    snprintf(ligne, 67, "%-30s Lv.%d", ennemi->nom, ennemi->niveau);
    printf("║ %-67s ║\n", ligne);
    barre_progression(barre_affichage, ennemi->pv, ennemi->pvMaximum, 20);
    snprintf(ligne, 67, "%35s HP   %s %d/%d", "", barre_affichage, ennemi->pv, ennemi->pvMaximum);
    printf("║ %-67s ║\n", ligne);
    printf("║ %-67s ║\n", "");
    printf("╠═════════════════════════════════════════════════════════════════════╣\n");
    printf("║ %-67s ║\n", "");
    snprintf(ligne, 67, " > %s", msg1); printf("║ %-67s ║\n", ligne);
    printf("║ %-67s ║\n", "");
    snprintf(ligne, 67, " > %s", msg2); printf("║ %-67s ║\n", ligne);
    printf("║ %-67s ║\n", "");
    printf("║ %-67s ║\n", "");
    printf("╠═════════════════════════════════════════════════════════════════════╣\n");
    snprintf(ligne, 67, "Lv.%-3d %45s %s", carte->niveau, "", carte->nom);
    printf("║ %-67s ║\n", ligne);
    barre_progression(barre_affichage, carte->pv, carte->pvMaximum, 20);
    snprintf(ligne, 67, "HP   %s %d/%d", barre_affichage, carte->pv, carte->pvMaximum);
    printf("║ %-67s ║\n", ligne);
    barre_progression(barre_affichage, carte->mana, carte->manaMaximum, 20);
    snprintf(ligne, 67, "MANA %s %d/%d", barre_affichage, carte->mana, carte->manaMaximum);
    printf("║ %-67s ║\n", ligne);
    printf("╠════════════════════════╦═════════════════════╦══════════════════════╣\n");
    printf("║ 1. %-19s ║ 2. %-16s ║      INVENTAIRE      ║\n",
            carte->capacites[0].nom, carte->capacites[1].nom);
    printf("║    D:%-2d M:%-2d           ║    D:%-2d M:%-2d        ║ 6. %-14s x%d ║\n",
            carte->capacites[0].degats, carte->capacites[0].coutMana,
            carte->capacites[1].degats, carte->capacites[1].coutMana,
            carte->inventaire.potionVie.nom, carte->inventaire.potionVie.quantite);
    printf("╠════════════════════════╬═════════════════════╣ 7. %-14s x%d ║\n",
            carte->inventaire.potionMana.nom, carte->inventaire.potionMana.quantite);
    printf("║ 3. %-19s ║ 4. %-16s ║                      ║\n",
            carte->capacites[2].nom, carte->capacites[3].nom);
    printf("║    D:%-2d M:%-2d           ║    Absorbe:%-2d M:%-2d  ║                      ║\n",
            carte->capacites[2].degats, carte->capacites[2].coutMana,
            carte->capacites[3].degats, carte->capacites[3].coutMana);
    printf("╠════════════════════════╩═════════════════════╣ 5. >>> FUIR <<<      ║\n");
    printf("╚══════════════════════════════════════════════╩══════════════════════╝\n");
    fflush(stdout);
}

/* ================================================================
   MONTEE DE NIVEAU
   ================================================================ */
static void monter_niveau(Carte *carte) {
    while (carte->xp >= carte->xpMaximum) {
        carte->xp         -= carte->xpMaximum;
        carte->niveau++;
        carte->xpMaximum   += (int)(carte->xpMaximum  * 1.2f);
        carte->pvMaximum   += (int)(carte->pvMaximum   * 1.15f);
        carte->manaMaximum += (int)(carte->manaMaximum * 1.25f);
        carte->pv   = carte->pvMaximum;
        carte->mana = carte->manaMaximum;
        printf(VERT "\nFELICITATIONS ! Niveau %d atteint !\n" REINIT, carte->niveau);
        printf("PV max : %d  |  MANA max : %d\n", carte->pvMaximum, carte->manaMaximum);
        for (int i = 0; i < 4; i++) {
            carte->capacites[i].degats += (int)(carte->capacites[i].degats * 0.1f);
            if (carte->capacites[i].coutMana > 0)
                carte->capacites[i].coutMana += (int)(carte->capacites[i].coutMana * 0.1f);
        }
        sauvegarder(carte);
        printf("Appuyez sur ENTREE pour continuer..."); fflush(stdout);
        while (getchar() != '\n');
    }
}

/* ================================================================
   COMBAT COMPLET
   Retourne : 1 = victoire, 0 = mort, -1 = fuite
   ================================================================ */
static int demarrer_combat(Carte *carte, int indice) {
    carte->arreter = 1;
#ifndef _WIN32
    terminal_restaurer();
#endif
    montrer_curseur();

    Ennemi *ennemi = &carte->ennemis[indice];
    char message_joueur[80]  = "Le combat commence !";
    char message_monstre[80] = "Preparez-vous...";
    int absorption_ennemi = 0, absorption_joueur = 0;
    int resultat = -1;

    dessiner_combat(carte, ennemi, message_joueur, message_monstre);
    attendre(1800);

    while (carte->pv > 0 && ennemi->pv > 0) {
        dessiner_combat(carte, ennemi, message_joueur, message_monstre);

        printf("\n Votre choix (1-7) : "); fflush(stdout);
        int choix;
        if (scanf("%d", &choix) != 1) { while(getchar() != '\n'); continue; }
        { int caractere; while ((caractere = getchar()) != '\n' && caractere != EOF); }

        if (choix == 5) {
            dessiner_combat(carte, ennemi, "Vous prenez la fuite...", "");
            attendre(1500); resultat = -1; break;
        }

        if (choix >= 1 && choix <= 3) {
            Attaque *attaque = &carte->capacites[choix-1];
            if (carte->mana >= attaque->coutMana) {
                carte->mana -= attaque->coutMana;
                int degats = attaque->degats - absorption_ennemi;
                if (degats < 0) degats = 0;
                ennemi->pv -= degats;
                if (absorption_ennemi > 0)
                    snprintf(message_joueur, 80, "Bouclier absorbe %d ! Vous infligez %d degats.", absorption_ennemi, degats);
                else
                    snprintf(message_joueur, 80, "Vous lancez %s ! (%d degats)", attaque->nom, degats);
                absorption_ennemi = 0;
            } else snprintf(message_joueur, 80, "Pas assez de mana !");

        } else if (choix == 4) {
            if (carte->mana >= carte->capacites[3].coutMana) {
                carte->mana -= carte->capacites[3].coutMana;
                absorption_joueur = carte->capacites[3].degats;
                snprintf(message_joueur, 80, "Vous dressez votre %s ! (Absorbe %d)", carte->capacites[3].nom, absorption_joueur);
            } else snprintf(message_joueur, 80, "Pas assez de mana !");

        } else if (choix == 6) {
            if (carte->inventaire.potionVie.quantite > 0) {
                carte->inventaire.potionVie.quantite--;
                int points_soins = (int)(carte->pvMaximum * 0.4f);
                carte->pv += points_soins; if (carte->pv > carte->pvMaximum) carte->pv = carte->pvMaximum;
                snprintf(message_joueur, 80, "Potion de vie ! +%d PV (%d/%d)", points_soins, carte->pv, carte->pvMaximum);
            } else snprintf(message_joueur, 80, "Plus de potions de vie !");

        } else if (choix == 7) {
            if (carte->inventaire.potionMana.quantite > 0) {
                carte->inventaire.potionMana.quantite--;
                int regeneration = (int)(carte->manaMaximum * 0.4f);
                carte->mana += regeneration; if (carte->mana > carte->manaMaximum) carte->mana = carte->manaMaximum;
                snprintf(message_joueur, 80, "Potion de mana ! +%d Mana (%d/%d)", regeneration, carte->mana, carte->manaMaximum);
            } else snprintf(message_joueur, 80, "Plus de potions de mana !");
        }

        dessiner_combat(carte, ennemi, message_joueur, "..."); attendre(1400);
        if (choix < 1 || choix > 7) continue;

        /* Tour de l'ennemi */
        if (ennemi->pv > 0) {
            int action = rand() % 4;
            if (action == 3) {
                absorption_ennemi = ennemi->capacites[3].degats;
                snprintf(message_monstre, 80, "%s dresse son %s ! (Absorbe %d)",
                         ennemi->nom, ennemi->capacites[3].nom, absorption_ennemi);
            } else {
                int degats = ennemi->capacites[action].degats - absorption_joueur;
                if (degats < 0) degats = 0;
                carte->pv -= degats;
                if (absorption_joueur > 0)
                    snprintf(message_monstre, 80, "Bouclier pare ! %s vous inflige seulement %d PV.", ennemi->nom, degats);
                else
                    snprintf(message_monstre, 80, "%s utilise %s ! (%d degats)", ennemi->nom, ennemi->capacites[action].nom, degats);
                absorption_joueur = 0;
            }
            dessiner_combat(carte, ennemi, message_joueur, message_monstre); attendre(1600);
        } else {
            dessiner_combat(carte, ennemi, message_joueur, "L'ennemi s'effondre !"); attendre(1800);
        }
    }

    vider_ecran();

    if (carte->pv > 0 && ennemi->pv <= 0) {
        int gain_experience = 100 * ennemi->niveau * (ennemi->est_boss ? 5 : 1);
        printf(VERT
            "================================================\n"
            "                VICTOIRE !\n"
            "================================================\n" REINIT);
        printf(" %s a ete terrasse !\n", ennemi->nom);
        printf(" Gain d'experience : +%d XP\n", gain_experience);
        carte->xp += gain_experience;
        if (ennemi->est_boss) carte->boss_mort = 1;
        monter_niveau(carte);
        sauvegarder(carte);
        printf("\nAppuyez sur ENTREE pour continuer..."); fflush(stdout);
        while (getchar() != '\n');
        resultat = 1;

    } else if (carte->pv <= 0) {
        printf(ROUGE
            "================================================\n"
            "                GAME OVER\n"
            "================================================\n" REINIT);
        printf(" %s a succombe sous les coups de %s...\n", carte->nom, ennemi->nom);
        printf(" Sauvegarde effacee.\n");
        char nom_fichier[60]; sprintf(nom_fichier, "%s.txt", carte->nom); remove(nom_fichier);
        attendre(3000);
        resultat = 0;
    }

    cacher_curseur();
#ifndef _WIN32
    terminal_brut();
#endif
    carte->arreter = 0;
    return resultat;
}

/* ================================================================
   GENERATION LABYRINTHE DFS
   ================================================================ */
typedef struct { int x, y; } Cellule;
static Cellule pile_cellules[MAX_LIGNES * MAX_COLONNES];
static int     sommet_pile = 0;
static void empiler(int x, int y){ pile_cellules[sommet_pile].x=x; pile_cellules[sommet_pile].y=y; sommet_pile++; }
static Cellule depiler(void){ return pile_cellules[--sommet_pile]; }
static int  pile_vide(void) { return sommet_pile == 0; }

static void melanger_directions(int d[][2]) {
    for (int i = 3; i > 0; i--) {
        int j = rand() % (i+1), temp_x = d[i][0], temp_y = d[i][1];
        d[i][0]=d[j][0]; d[i][1]=d[j][1]; d[j][0]=temp_x; d[j][1]=temp_y;
    }
}

static void generer_labyrinthe(Carte *carte) {
    for (int y = 0; y < carte->lignes; y++)
        for (int x = 0; x < carte->colonnes; x++)
            carte->grille[y][x] = MUR;
    static int visite[MAX_LIGNES][MAX_COLONNES];
    memset(visite, 0, sizeof(visite));
    sommet_pile = 0; empiler(1,1); visite[1][1] = 1; carte->grille[1][1] = VIDE;
    int directions[4][2] = {{0,-2},{0,2},{-2,0},{2,0}};
    while (!pile_vide()) {
        Cellule cellule_courante = pile_cellules[sommet_pile-1]; melanger_directions(directions); int progres = 0;
        for (int d = 0; d < 4; d++) {
            int nouvelle_x = cellule_courante.x+directions[d][0], nouvelle_y = cellule_courante.y+directions[d][1];
            if (nouvelle_x>0 && nouvelle_x<carte->colonnes-1 && nouvelle_y>0 && nouvelle_y<carte->lignes-1 && !visite[nouvelle_y][nouvelle_x]) {
                carte->grille[cellule_courante.y+directions[d][1]/2][cellule_courante.x+directions[d][0]/2] = VIDE;
                carte->grille[nouvelle_y][nouvelle_x] = VIDE; visite[nouvelle_y][nouvelle_x] = 1;
                empiler(nouvelle_x, nouvelle_y); progres = 1; break;
            }
        }
        if (!progres) depiler();
    }
}

static void ajouter_salles(Carte *carte) {
    int nombre_salles = 3 + carte->niveau;
    for (int s = 0; s < nombre_salles; s++) {
        int largeur_salle = 3+rand()%3, hauteur_salle = 3+rand()%3;
        int origine_x = 1+rand()%(carte->colonnes-largeur_salle-2), origine_y = 1+rand()%(carte->lignes-hauteur_salle-2);
        for (int y = origine_y; y < origine_y+hauteur_salle && y < carte->lignes-1; y++)
            for (int x = origine_x; x < origine_x+largeur_salle && x < carte->colonnes-1; x++)
                carte->grille[y][x] = VIDE;
    }
}

static Position position_aleatoire_vide(Carte *carte, int excl_x, int excl_y, int distance_min) {
    Position pos; int tentatives = 0;
    do {
        pos.x = 1+rand()%(carte->colonnes-2);
        pos.y = 1+rand()%(carte->lignes-2);
        tentatives++;
    } while ((carte->grille[pos.y][pos.x] != VIDE ||
             (distance_min > 0 && valeur_absolue(pos.x-excl_x)+valeur_absolue(pos.y-excl_y) < distance_min)) && tentatives < 9999);
    return pos;
}

/* ================================================================
   INITIALISATION CARTE + JOUEUR
   ================================================================ */
static void initialiser_carte(Carte *carte) {
    carte->lignes   = hauteur_carte(carte->niveau);
    carte->colonnes = largeur_carte(carte->niveau);
    generer_labyrinthe(carte); ajouter_salles(carte);

    carte->position_joueur = (Position){1,1};
    carte->grille[1][1] = JOUEUR;

    /* Ennemis normaux */
    carte->nombre_ennemis = 0;
    int nombre = quota_ennemis(carte->niveau);
    for (int i = 0; i < nombre && carte->nombre_ennemis < MAX_ENNEMIS-1; i++) {
        Position pos = position_aleatoire_vide(carte, 1, 1, 10);
        Ennemi *ennemi = &carte->ennemis[carte->nombre_ennemis];
        memset(ennemi, 0, sizeof(Ennemi));
        ennemi->position = pos; ennemi->vivant = 1; ennemi->est_boss = 0;
        int type_ennemi = rand() % 2 + 1;
        configurer_ennemi(ennemi, type_ennemi, carte->niveau);
        carte->grille[pos.y][pos.x] = ENNEMI;
        carte->nombre_ennemis++;
    }
    /* Boss */
    {
        Position pos = position_aleatoire_vide(carte, 1, 1, carte->colonnes/2);
        Ennemi *ennemi = &carte->ennemis[carte->nombre_ennemis];
        memset(ennemi, 0, sizeof(Ennemi));
        ennemi->position = pos; ennemi->vivant = 1; ennemi->est_boss = 1;
        configurer_ennemi(ennemi, 100, carte->niveau);
        carte->grille[pos.y][pos.x] = BOSS;
        carte->nombre_ennemis++;
    }
    /* Cle, sortie, objets mystere */
    { Position pos = position_aleatoire_vide(carte, 1, 1, 8); carte->grille[pos.y][pos.x] = CLE; }
    { Position pos = position_aleatoire_vide(carte, 1, 1, carte->colonnes/2+carte->lignes/2); carte->grille[pos.y][pos.x] = SORTIE; }
    int nombre_objets = quota_objets(carte->niveau); if (nombre_objets > 20) nombre_objets = 20;
    for (int i = 0; i < nombre_objets; i++) {
        Position pos = position_aleatoire_vide(carte, 0, 0, 0); carte->grille[pos.y][pos.x] = MYSTERE;
    }

    carte->a_la_cle = 0; carte->sortie_ouverte = 0;
    carte->arreter = 0;
    strcpy(carte->message, "Explore ! Trouve K et bats B pour ouvrir S.");
    initialiser_verrou(&carte->verrou);
}

static void nouvelle_partie(Carte *carte, const char *nom) {
    strncpy(carte->nom, nom, 49); carte->nom[49] = '\0';
    carte->pvMaximum   = 100; carte->pv   = 100;
    carte->manaMaximum = 50;  carte->mana = 50;
    carte->xp = 0; carte->xpMaximum = 1000;
    carte->niveau    = 1;
    carte->boss_mort = 0;
    initialiser_inventaire(carte);
    initialiser_capacites_joueur(carte);
    initialiser_carte(carte);
}

static void appliquer_stats_niveau(Carte *carte) {
    initialiser_capacites_joueur(carte);
}

/* ================================================================
   HUD EXPLORATION (cadre fixe + mise a jour dynamique)
   ================================================================ */
static void dessiner_cadre_hud(void) {
    aller_position(1,1);
    printf(BLANC
    "╔══════════════════════════════════════════════════════════╗\n"
    "║" REINIT "           \xF0\x9F\x91\xBE  LABYRINTHE INFERNAL  \xF0\x9F\x91\xBE" BLANC "                   ║\n"
    "╠══════════════════════════════════════════════════════════╣\n"
    "║" REINIT "                                          " CYAN "Inventaire" REINIT BLANC "     ║\n"
    "║                                                         ║\n"
    "║" REINIT " " VERT "HP  " REINIT BLANC "                                                    ║\n"
    "║" REINIT " " BLEU "MANA" REINIT BLANC "                                                    ║\n"
    "║" REINIT " " MAGENTA "XP  " REINIT BLANC "                                                    ║\n"
    "║                                                         ║\n"
    "╠══════════════════════════════════════════════════════════╣\n"
    "║                                                         ║\n"
    "║                                                         ║\n"
    "╚══════════════════════════════════════════════════════════╝\n" REINIT);
    printf(GRIS
    " [ZQSD] Deplacer  [X] Quitter"
    "    @ Joueur  E Ennemi  B Boss  K Cle  ? Objet  S Sortie\n" REINIT);
    fflush(stdout);
}

static void mettre_a_jour_hud(Carte *carte) {
    char barre_affichage[30];
    aller_position(3, 4); printf(CYAN "%-38s" REINIT, carte->nom);

    barre_progression(barre_affichage, carte->pv, carte->pvMaximum, 20);
    aller_position(6, 6); printf(VERT "%s %4d/%-4d" REINIT, barre_affichage, carte->pv, carte->pvMaximum);
    aller_position(41, 6); printf(CYAN "potion mana:" JAUNE "%-3d" REINIT, carte->inventaire.potionMana.quantite);

    barre_progression(barre_affichage, carte->mana, carte->manaMaximum, 20);
    aller_position(6, 7); printf(BLEU "%s %4d/%-4d" REINIT, barre_affichage, carte->mana, carte->manaMaximum);
    aller_position(41, 7); printf(CYAN "potion hp  :" JAUNE "%-3d" REINIT, carte->inventaire.potionVie.quantite);

    barre_progression(barre_affichage, carte->xp, carte->xpMaximum, 20);
    aller_position(6, 8); printf(MAGENTA "%s %5d/%-6d" REINIT, barre_affichage, carte->xp, carte->xpMaximum);

    aller_position(3, 9);
    printf(JAUNE "Level:%-3d" REINIT "  %s  %s  Sortie:%s    ",
           carte->niveau,
           carte->a_la_cle    ? VERT  "[CLE OK]"  REINIT : GRIS  "[CLE ?]"  REINIT,
           carte->boss_mort   ? VERT  "[BOSS OK]" REINIT : ROUGE "[BOSS X]" REINIT,
           carte->sortie_ouverte ? VERT "OUVERTE" REINIT : ROUGE "VERROU " REINIT);

    /* Barre de traque */
    double max_temps_restant = -1.0;
    for (int i = 0; i < carte->nombre_ennemis; i++) {
        Ennemi *ennemi = &carte->ennemis[i];
        if (!ennemi->vivant || !ennemi->en_traque) continue;
        double temps_ecoule  = difftime(time(NULL), ennemi->debut_traque);
        double temps_restant = (double)DUREE_TRAQUE_S - temps_ecoule;
        if (temps_restant > max_temps_restant) max_temps_restant = temps_restant;
    }
    aller_position(1, 11);
    if (max_temps_restant >= 0.0) {
        int valeur_barre = (int)(max_temps_restant * 20.0 / DUREE_TRAQUE_S);
        if (valeur_barre < 0) valeur_barre = 0; if (valeur_barre > 20) valeur_barre = 20;
        char barre_traque[30]; int position = 0; barre_traque[position++] = '[';
        for (int i = 0; i < 20; i++) barre_traque[position++] = (i < valeur_barre ? '=' : '-');
        barre_traque[position++] = ']'; barre_traque[position] = '\0';
        printf(BLANC "║ " REINIT FOND_ROUGE BLANC
               "Traque : %s %2.0fs restantes                  "
               REINIT BLANC " ║" REINIT, barre_traque, max_temps_restant);
    } else {
        printf(BLANC "║" REINIT
               "                                                         "
               BLANC "║" REINIT);
    }
    aller_position(3, 12); printf("%-55s", carte->message);
    fflush(stdout);
}

/* ================================================================
   AFFICHAGE CARTE DIFFERENTIEL
   ================================================================ */
static char grille_precedente[MAX_LIGNES][MAX_COLONNES];
static int  premier_affichage = 1;
#define LIGNE_DEBUT_CARTE (HUD_LIGNES + 2)

static void reinitialiser_ecran(void) {
    printf("\033[2J");
    memset(grille_precedente, 0, sizeof(grille_precedente));
    premier_affichage = 1;
    fflush(stdout);
}

static void dessiner_case(int colonne, int ligne, char c, int sortie_ouverte_param) {
    aller_position(colonne, ligne);
    switch (c) {
        case MUR:    printf(GRIS "\xe2\x96\x88" REINIT); break;
        case JOUEUR: printf(VERT "@" REINIT); break;
        case ENNEMI: printf(ROUGE "E" REINIT); break;
        case BOSS:   printf(MAGENTA "B" REINIT); break;
        case CLE:    printf(JAUNE "K" REINIT); break;
        case SORTIE: printf(sortie_ouverte_param ? CYAN "S" REINIT : BLEU "S" REINIT); break;
        case MYSTERE:printf(JAUNE "?" REINIT); break;
        default:     printf(" "); break;
    }
}

static void afficher_carte(Carte *carte) {
    for (int y = 0; y < carte->lignes; y++)
        for (int x = 0; x < carte->colonnes; x++) {
            char c = carte->grille[y][x];
            if (premier_affichage || c != grille_precedente[y][x]) {
                dessiner_case(x+1, LIGNE_DEBUT_CARTE+y, c, carte->sortie_ouverte);
                grille_precedente[y][x] = c;
            }
        }
    premier_affichage = 0;
    fflush(stdout);
}

/* ================================================================
   FILS D'EXECUTION (THREADS)
   ================================================================ */
static TYPE_FIL fil_hud(ARG_FIL argument) {
    Carte *carte = (Carte*)argument;
    while (!carte->arreter) {
        PAUSE_MS(200);
        if (carte->arreter) break;
        verrouiller(&carte->verrou);
        mettre_a_jour_hud(carte);
        deverrouiller(&carte->verrou);
    }
    return RETOUR_FIL;
}

static void deplacer_ennemis(Carte *carte) {
    int directions_base[4][2] = {{0,-1},{0,1},{-1,0},{1,0}};
    for (int i = 0; i < carte->nombre_ennemis; i++) {
        Ennemi *ennemi = &carte->ennemis[i];
        if (!ennemi->vivant) continue;
        int directions[4][2]; memcpy(directions, directions_base, sizeof(directions_base)); melanger_directions(directions);
        if (ennemi->en_traque) {
            int meilleure_direction = 0, meilleure_distance = 9999;
            for (int k = 0; k < 4; k++) {
                Position prochaine_pos = {ennemi->position.x+directions[k][0], ennemi->position.y+directions[k][1]};
                int distance = distance_manhattan(prochaine_pos, carte->position_joueur);
                if (distance < meilleure_distance) { meilleure_distance = distance; meilleure_direction = k; }
            }
            int temp_x = directions[0][0], temp_y = directions[0][1];
            directions[0][0] = directions[meilleure_direction][0]; directions[0][1] = directions[meilleure_direction][1];
            directions[meilleure_direction][0] = temp_x; directions[meilleure_direction][1] = temp_y;
        }
        char symbole = ennemi->est_boss ? BOSS : ENNEMI;
        for (int k = 0; k < 4; k++) {
            int nouvelle_x = ennemi->position.x+directions[k][0], nouvelle_y = ennemi->position.y+directions[k][1];
            if (nouvelle_x<=0||nouvelle_x>=carte->colonnes-1||nouvelle_y<=0||nouvelle_y>=carte->lignes-1) continue;
            if (carte->grille[nouvelle_y][nouvelle_x] == VIDE) {
                carte->grille[ennemi->position.y][ennemi->position.x] = VIDE;
                ennemi->position.x = nouvelle_x; ennemi->position.y = nouvelle_y;
                carte->grille[nouvelle_y][nouvelle_x] = symbole;
                break;
            }
        }
    }
}

static TYPE_FIL fil_ia(ARG_FIL argument) {
    Carte *carte = (Carte*)argument;
    while (!carte->arreter) {
        PAUSE_MS(INTERVALLE_IA_MS);
        if (carte->arreter) break;
        verrouiller(&carte->verrou);
        deplacer_ennemis(carte);
        afficher_carte(carte);
        deverrouiller(&carte->verrou);
    }
    return RETOUR_FIL;
}

/* ================================================================
   DETECTION + TRAQUE
   ================================================================ */
static void verifier_detection(Carte *carte) {
    for (int i = 0; i < carte->nombre_ennemis; i++) {
        Ennemi *ennemi = &carte->ennemis[i];
        if (!ennemi->vivant) continue;
        int distance = distance_manhattan(ennemi->position, carte->position_joueur);
        if (distance <= RAYON_DETECTION && !ennemi->en_traque) {
            ennemi->en_traque = 1; ennemi->debut_traque = time(NULL);
            snprintf(carte->message, 80, ennemi->est_boss ?
                "!!! LE BOSS T'A REPERE ! COURS !!!" :
                "Un ennemi t'a repere ! 10s de traque !");
        }
        if (ennemi->en_traque) {
            double temps_ecoule = difftime(time(NULL), ennemi->debut_traque);
            if (temps_ecoule >= (double)DUREE_TRAQUE_S) {
                ennemi->en_traque = 0;
                snprintf(carte->message, 80, "Tu as echappe a la traque !");
            }
        }
    }
}

/* ================================================================
   RAMASSAGE D'OBJETS
   ================================================================ */
static void gerer_case(Carte *carte, int nouvelle_x, int nouvelle_y) {
    char case_destination = carte->grille[nouvelle_y][nouvelle_x];
    switch (case_destination) {
        case MYSTERE: {
            int gain_points = 10 + rand() % 21;
            if (rand() % 2 == 0) {
                carte->pv += gain_points; if (carte->pv > carte->pvMaximum) carte->pv = carte->pvMaximum;
                snprintf(carte->message, 80, "Potion de VIE ! +%d PV (%d/%d)", gain_points, carte->pv, carte->pvMaximum);
                carte->inventaire.potionVie.quantite++;
            } else {
                carte->mana += gain_points; if (carte->mana > carte->manaMaximum) carte->mana = carte->manaMaximum;
                snprintf(carte->message, 80, "Potion de MANA ! +%d Mana (%d/%d)", gain_points, carte->mana, carte->manaMaximum);
                carte->inventaire.potionMana.quantite++;
            }
            break;
        }
        case CLE:
            carte->a_la_cle = 1;
            snprintf(carte->message, 80, "CLE OBTENUE ! Bats le Boss pour ouvrir la Sortie.");
            break;
        case SORTIE:
            if (!carte->sortie_ouverte) {
                if (!carte->a_la_cle && !carte->boss_mort)
                    snprintf(carte->message, 80, "VERROU : il faut la CLE + vaincre le Boss !");
                else if (!carte->a_la_cle)
                    snprintf(carte->message, 80, "VERROU : il te manque encore la CLE !");
                else
                    snprintf(carte->message, 80, "VERROU : il faut encore vaincre le Boss !");
            }
            break;
        default: break;
    }
}

/* ================================================================
   BOUCLE D'EXPLORATION
   Retourne : 2 = niveau suivant, 0 = mort, -1 = quitte
   ================================================================ */
static int jouer_niveau(Carte *carte) {
    reinitialiser_ecran();
    dessiner_cadre_hud();

    FilExecution fil_ennemis = demarrer_fil(fil_ia,  carte);
    FilExecution fil_tableau = demarrer_fil(fil_hud, carte);

    int resultat = -1;

    while (1) {
        while (!touche_pressee()) {
            PAUSE_MS(20);
            verrouiller(&carte->verrou);
            verifier_detection(carte);

            if (carte->a_la_cle && carte->boss_mort && !carte->sortie_ouverte) {
                carte->sortie_ouverte = 1;
                snprintf(carte->message, 80, "SORTIE OUVERTE ! Va vers S pour continuer !");
            }

            /* Contact ennemi en traque -> combat */
            int contact = 0;
            for (int i = 0; i < carte->nombre_ennemis && !contact; i++) {
                Ennemi *ennemi = &carte->ennemis[i];
                if (!ennemi->vivant || !ennemi->en_traque) continue;
                if (ennemi->position.x == carte->position_joueur.x && ennemi->position.y == carte->position_joueur.y) {
                    contact = 1;
                    carte->arreter = 1; 
                    deverrouiller(&carte->verrou);
                    attendre_fil(fil_ennemis);
                    attendre_fil(fil_tableau);

                    int resultat_combat = demarrer_combat(carte, i);
                    verrouiller(&carte->verrou);
                    if (resultat_combat == 1) {
                        carte->grille[ennemi->position.y][ennemi->position.x] = VIDE;
                        ennemi->vivant = 0; ennemi->en_traque = 0;
                        snprintf(carte->message, 80, "Ennemi vaincu !");
                        reinitialiser_ecran(); dessiner_cadre_hud(); mettre_a_jour_hud(carte); premier_affichage = 1;
                        carte->arreter = 0;
                        fil_ennemis = demarrer_fil(fil_ia,  carte);
                        fil_tableau = demarrer_fil(fil_hud, carte);
                    } else if (resultat_combat == 0) {
                        deverrouiller(&carte->verrou);
                        resultat = 0; return resultat; // On quitte directement
                    } else {
                        ennemi->en_traque = 0;
                        reinitialiser_ecran(); dessiner_cadre_hud(); mettre_a_jour_hud(carte); premier_affichage = 1;
                        carte->arreter = 0;
                        fil_ennemis = demarrer_fil(fil_ia,  carte);
                        fil_tableau = demarrer_fil(fil_hud, carte);
                    }
                }
            }
            if (carte->pv <= 0) { deverrouiller(&carte->verrou); resultat = 0; goto fin; }
            deverrouiller(&carte->verrou);
        }

        char touche = lire_touche();
        if (touche == 'x' || touche == 'X') { resultat = -1; goto fin; }

        int deplacement_x = 0, deplacement_y = 0;
        if      (touche == 'z' || touche == 'Z') deplacement_y = -1;
        else if (touche == 's' || touche == 'S') deplacement_y =  1;
        else if (touche == 'q' || touche == 'Q') deplacement_x = -1;
        else if (touche == 'd' || touche == 'D') deplacement_x =  1;
        else continue;

        verrouiller(&carte->verrou);

        int nouvelle_x = carte->position_joueur.x + deplacement_x;
        int nouvelle_y = carte->position_joueur.y + deplacement_y;

        if (nouvelle_x<=0||nouvelle_x>=carte->colonnes-1||nouvelle_y<=0||nouvelle_y>=carte->lignes-1) { deverrouiller(&carte->verrou); continue; }
        char case_destination = carte->grille[nouvelle_y][nouvelle_x];
        if (case_destination == MUR) { deverrouiller(&carte->verrou); continue; }

        /* Collision directe avec ennemi */
        if (case_destination == ENNEMI || case_destination == BOSS) {
            int indice = -1;
            for (int i = 0; i < carte->nombre_ennemis; i++)
                if (carte->ennemis[i].vivant &&
                    carte->ennemis[i].position.x == nouvelle_x && carte->ennemis[i].position.y == nouvelle_y)
                    { indice = i; break; }
            if (indice >= 0) {
                carte->arreter = 1;
                deverrouiller(&carte->verrou);
                attendre_fil(fil_ennemis);
                attendre_fil(fil_tableau);

                int resultat_combat = demarrer_combat(carte, indice);
                verrouiller(&carte->verrou);
                if (resultat_combat == 1) {
                    carte->grille[nouvelle_y][nouvelle_x] = VIDE;
                    carte->ennemis[indice].vivant = 0; carte->ennemis[indice].en_traque = 0;
                    snprintf(carte->message, 80, "Ennemi vaincu !");
                    reinitialiser_ecran(); dessiner_cadre_hud(); mettre_a_jour_hud(carte); premier_affichage = 1;
                    carte->arreter = 0;
                    fil_ennemis = demarrer_fil(fil_ia,  carte);
                    fil_tableau = demarrer_fil(fil_hud, carte);
                } else if (resultat_combat == 0) {
                    deverrouiller(&carte->verrou); resultat = 0; return resultat;
                } else {
                    reinitialiser_ecran(); dessiner_cadre_hud(); mettre_a_jour_hud(carte); premier_affichage = 1;
                    carte->arreter = 0;
                    fil_ennemis = demarrer_fil(fil_ia,  carte);
                    fil_tableau = demarrer_fil(fil_hud, carte);
                }
            }
            deverrouiller(&carte->verrou); continue;
        }

        gerer_case(carte, nouvelle_x, nouvelle_y);

        /* Sortie vers niveau suivant */
        if (case_destination == SORTIE && carte->sortie_ouverte) {
            afficher_carte(carte); mettre_a_jour_hud(carte);
            deverrouiller(&carte->verrou);
            PAUSE_MS(800); resultat = 2; goto fin;
        }

        /* Deplacement normal */
        if (case_destination != SORTIE || carte->sortie_ouverte) {
            carte->grille[carte->position_joueur.y][carte->position_joueur.x] = VIDE;
            carte->position_joueur.x = nouvelle_x; carte->position_joueur.y = nouvelle_y;
            carte->grille[nouvelle_y][nouvelle_x] = JOUEUR;
        }

        verifier_detection(carte);
        afficher_carte(carte);
        deverrouiller(&carte->verrou);
    }

fin:
    carte->arreter = 1;
    attendre_fil(fil_ennemis);
    attendre_fil(fil_tableau);
    detruire_verrou(&carte->verrou);
    return resultat;
}

/* ================================================================
   GESTION DES SAUVEGARDES (menu)
   ================================================================ */
static void simulateur_chargement(void) {
    for (int i = 0; i <= 100; i += 5) {
        printf("\rChargement [");
        for (int j = 0; j < (i/5);  j++) printf(".");
        for (int j = i/5; j < 20; j++) printf(" ");
        printf("] %d%%", i);
        fflush(stdout);
        attendre(80);
    }
    printf("\n\nLancement termine ! Pret pour l'aventure.\n\n");
}

static int lister_sauvegardes(char liste[][60], int maximum) {
    int compteur = 0;
#ifdef _WIN32
    struct _finddata_t fichier_trouve; intptr_t handle_fichier;
    if ((handle_fichier = _findfirst("*.txt", &fichier_trouve)) != -1L) {
        do {
            if (compteur < maximum) { strcpy(liste[compteur], fichier_trouve.name); compteur++; }
        } while (_findnext(handle_fichier, &fichier_trouve) == 0);
        _findclose(handle_fichier);
    }
#else
    DIR *dossier = opendir("."); struct dirent *entree;
    if (dossier) {
        while ((entree = readdir(dossier)) && compteur < maximum) {
            char *extension = strrchr(entree->d_name, '.');
            if (extension && strcmp(extension, ".txt") == 0) {
                strcpy(liste[compteur], entree->d_name); compteur++;
            }
        }
        closedir(dossier);
    }
#endif
    return compteur;
}

static int choisir_sauvegarde(char *nom_choisi) {
    char liste[20][60];
    int compteur = lister_sauvegardes(liste, 20);
    if (compteur == 0) return 0;
    printf("=== SAUVEGARDES DISPONIBLES ===\n");
    for (int i = 0; i < compteur; i++) {
        char nom_sans_extension[60]; strcpy(nom_sans_extension, liste[i]);
        char *pointeur = strrchr(nom_sans_extension, '.'); if (pointeur) *pointeur = '\0';
        printf("%d. %s\n", i+1, nom_sans_extension);
    }
    int choix = lire_entier("Choix (0=annuler) : ", 0, compteur);
    if (choix == 0) return 0;
    strcpy(nom_choisi, liste[choix-1]);
    char *pointeur = strrchr(nom_choisi, '.'); if (pointeur) *pointeur = '\0';
    return 1;
}

static void supprimer_sauvegarde(void) {
    char liste[20][60];
    int compteur = lister_sauvegardes(liste, 20);
    if (compteur == 0) { printf("Aucune sauvegarde.\n"); attendre(1500); return; }

    printf("=== SUPPRIMER UNE SAUVEGARDE ===\n");
    for (int i = 0; i < compteur; i++) {
        char nom_sans_extension[60]; strcpy(nom_sans_extension, liste[i]);
        char *pointeur = strrchr(nom_sans_extension, '.'); if (pointeur) *pointeur = '\0';
        printf("%d. %s\n", i+1, nom_sans_extension);
    }
    int choix = lire_entier("Choix (0=annuler) : ", 0, compteur);
    if (choix == 0) return;

    printf("\n[!] Supprimer '%s' ?\n1. Oui\n2. Non\n", liste[choix-1]);
    if (lire_entier("Choix : ", 1, 2) == 1) {
        if (remove(liste[choix-1]) == 0) printf("[OK] Supprimee.\n");
        else printf("[ERREUR] Impossible.\n");
    }
    attendre(1500);
}

/* ================================================================
   BOUCLE PRINCIPALE DU JEU (exploration multi-niveaux)
   ================================================================ */
static void boucle_jeu(Carte *carte) {
#ifndef _WIN32
    terminal_brut();
#endif
    cacher_curseur();

    while (1) {
        int resultat = jouer_niveau(carte);

        if (resultat == 2) {
            /* Passage niveau suivant : on conserve les stats du joueur */
            int prochain_niveau       = carte->niveau + 1;
            int points_vie            = carte->pv,   points_vie_max   = carte->pvMaximum   + 20;
            int mana_actuel           = carte->mana, mana_max         = carte->manaMaximum + 10;
            int experience            = carte->xp,   experience_max   = carte->xpMaximum;
            int potions_hp            = carte->inventaire.potionVie.quantite;
            int potions_mana          = carte->inventaire.potionMana.quantite;
            char nom[50]; strncpy(nom, carte->nom, 49);
            Attaque capacites_sauvegardees[4]; memcpy(capacites_sauvegardees, carte->capacites, sizeof(capacites_sauvegardees));
            int boss_mort_sauvegarde  = carte->boss_mort;

            memset(carte, 0, sizeof(Carte));
            carte->niveau              = prochain_niveau;
            strncpy(carte->nom, nom, 49);
            carte->pv                  = points_vie;    carte->pvMaximum    = points_vie_max;
            carte->mana                = mana_actuel;   carte->manaMaximum  = mana_max;
            carte->xp                  = experience;    carte->xpMaximum    = experience_max;
            carte->inventaire.potionVie.quantite  = potions_hp;
            carte->inventaire.potionMana.quantite = potions_mana;
            carte->boss_mort           = boss_mort_sauvegarde;
            strcpy(carte->inventaire.potionVie.nom,  "Potion de vie");
            strcpy(carte->inventaire.potionMana.nom, "Potion de mana");
            memcpy(carte->capacites, capacites_sauvegardees, sizeof(capacites_sauvegardees));
            initialiser_carte(carte);

            montrer_curseur();
#ifndef _WIN32
            terminal_restaurer();
#endif
            printf(VERT
                "\n╔══════════════════════════════════╗\n"
                "║    NIVEAU %2d COMMENCE !          ║\n"
                "╚══════════════════════════════════╝\n" REINIT, prochain_niveau);
            attendre(1500);
#ifndef _WIN32
            terminal_brut();
#endif
            cacher_curseur();

        } else if (resultat == 0) {
            reinitialiser_ecran();
            montrer_curseur();
            printf(ROUGE
                "\n╔═════════════════════════════════╗\n"
                "║          GAME OVER              ║\n"
                "╚═════════════════════════════════╝\n" REINIT);
            printf(" %s a succombe dans le donjon...\n\n", carte->nom);
            break;

        } else { /* resultat == -1, quitte */
            reinitialiser_ecran();
            montrer_curseur();
            printf(JAUNE "\n A bientot, %s !\n\n" REINIT, carte->nom);
            break;
        }
    }

#ifndef _WIN32
    terminal_restaurer();
#endif
    montrer_curseur();
}

/* ================================================================
   MENU PRINCIPAL
   ================================================================ */
int main(void) {
    #ifdef _WIN32
        SetConsoleOutputCP(65001);
        SetConsoleCP(65001);
    #endif
    srand(time(NULL));
    srand((unsigned)time(NULL));
    simulateur_chargement();

    int quitter = 0;
    while (!quitter) {
        printf("+------------------------------+\n");
        printf("|  BIENVENUE DANS LE DONJON    |\n");
        printf("+------------------------------+\n");
        printf("1. NOUVELLE PARTIE\n");
        printf("2. CONTINUER (saisir nom)\n");
        printf("3. CHARGER (liste)\n");
        printf("4. SUPPRIMER SAUVEGARDE\n");
        printf("5. QUITTER\n");
        int choix = lire_entier("Votre choix : ", 1, 5);

        switch (choix) {
            case 1: {
                char nom[50];
                do { lire_chaine(nom, 50, "Nom du personnage (sans espaces) : "); }
                while (nom[0] == '\0');

                char nom_fichier[60]; sprintf(nom_fichier, "%s.txt", nom);
                FILE *fichier_test = fopen(nom_fichier, "r");
                if (fichier_test) {
                    fclose(fichier_test);
                    printf("Sauvegarde existante.\n1. Ecraser\n2. Reprendre\n");
                    if (lire_entier("Choix : ", 1, 2) == 2) {
                        Carte *carte = (Carte*)calloc(1, sizeof(Carte));
                        if (!carte) { printf("Erreur memoire.\n"); break; }
                        charger_dans_carte(carte, nom);
                        strcpy(carte->inventaire.potionVie.nom,  "Potion de vie");
                        strcpy(carte->inventaire.potionMana.nom, "Potion de mana");
                        initialiser_carte(carte);
                        boucle_jeu(carte); free(carte); break;
                    }
                }
                Carte *carte = (Carte*)calloc(1, sizeof(Carte));
                if (!carte) { printf("Erreur memoire.\n"); break; }
                nouvelle_partie(carte, nom);
                sauvegarder(carte);
                boucle_jeu(carte);
                free(carte);
                break;
            }
            case 2: {
                char nom[50];
                lire_chaine(nom, 50, "Nom du personnage : ");
                Carte *carte = (Carte*)calloc(1, sizeof(Carte));
                if (!carte) { printf("Erreur memoire.\n"); break; }
                if (!charger_dans_carte(carte, nom)) {
                    printf("Aucune sauvegarde trouvee pour '%s'.\n", nom);
                    attendre(1500); free(carte); break;
                }
                strcpy(carte->inventaire.potionVie.nom,  "Potion de vie");
                strcpy(carte->inventaire.potionMana.nom, "Potion de mana");
                initialiser_carte(carte);
                boucle_jeu(carte);
                free(carte);
                break;
            }
            case 3: {
                char nom[60];
                if (!choisir_sauvegarde(nom)) break;
                Carte *carte = (Carte*)calloc(1, sizeof(Carte));
                if (!carte) { printf("Erreur memoire.\n"); break; }
                if (!charger_dans_carte(carte, nom)) {
                    printf("Erreur de chargement.\n"); attendre(1500); free(carte); break;
                }
                strcpy(carte->inventaire.potionVie.nom,  "Potion de vie");
                strcpy(carte->inventaire.potionMana.nom, "Potion de mana");
                initialiser_carte(carte);
                boucle_jeu(carte);
                free(carte);
                break;
            }
            case 4:
                supprimer_sauvegarde();
                break;
            case 5:
                quitter = 1;
                break;
        }
    }
    printf("Aurevoir !\n");
    return 0;
}