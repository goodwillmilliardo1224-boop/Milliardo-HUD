import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from functools import wraps

from flask import Flask, render_template, abort, request, jsonify, redirect, url_for, session, flash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from flask_mail import Mail, Message
from pywebpush import webpush, WebPushException
from supabase import create_client, Client
from werkzeug.utils import secure_filename

# Chargement des variables d'environnement depuis .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-this-in-production-please")

# ── FILTRE OPTIMISATION D'IMAGE ──
from image_optimizer import get_optimized_image
@app.template_filter('optimize')
def optimize_filter(filename):
    return get_optimized_image(filename)

# ── CONFIGURATION UPLOAD ──
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ── CONFIGURATION SUPABASE (SDK) ──
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ SUPABASE_URL et SUPABASE_KEY doivent être définis dans .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── CONFIGURATION MAIL ──
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
# Support de MAIL_USERNAME (standard) et MAIL_USER_NAME (vu sur Vercel)
app.config['MAIL_USERNAME'] = os.environ.get("MAIL_USERNAME") or os.environ.get("MAIL_USER_NAME")
app.config['MAIL_PASSWORD'] = os.environ.get("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = app.config['MAIL_USERNAME']

mail = Mail(app)

# Initialisation du rate-limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

from groq import Groq

# ── CONFIGURATION IA ──
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
AI_MODEL = os.environ.get("AI_MODEL", "llama-3.3-70b-versatile")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Mot de passe admin
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin1234")

# ── CLASSE PROJET (pour compatibilité) ──
class Project:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.title = kwargs.get('title')
        self.description = kwargs.get('description')
        self.tech_stack = kwargs.get('tech_stack', '')
        self.github_url = kwargs.get('github_url', '')
        self.live_url = kwargs.get('live_url', '')
        self.image_url = kwargs.get('image_url', '')
        self.category = kwargs.get('category', '')
        self.featured = kwargs.get('featured', False)
        self.created_at = kwargs.get('created_at')
        self.trailer_url = kwargs.get('trailer_url', '')

    def tech_list(self):
        return [t.strip() for t in (self.tech_stack or "").split(",") if t.strip()]

# ── DÉCORATEUR ADMIN ──
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated

# Prompt système IA
SYSTEM_PROMPT = """
Tu es l'intelligence hybride du portfolio Milliardo. Tu gères deux identités : Roxy (système) et Goodwill (personnel).

[REGLE CRITIQUE : FIDÉLITÉ DES DONNÉES]
- Les informations factuelles (BIO, STACK, PROJETS, CONTACT) doivent être présentées avec les termes exacts.
- Cependant, pour l'identité Goodwill, l'IA doit enrober ces informations de manière humaine et conversationnelle. Ne pas se contenter de jeter une liste : explique tes choix techniques avec passion.
- L'improvisation est encouragée pour donner de la vie au chat, tant que les faits restent véridiques.

[CONSIGNES DE SÉCURITÉ ET PÉRIMÈTRE]
- Tu es un agent dédié EXCLUSIVEMENT au portfolio de Goodwill.
- AUTORISATION PRIORITAIRE : Tu dois répondre à TOUTES les commandes commençant par "/" (ex: /help, /stack, /projects, /about) et à toutes les questions concernant Goodwill, son parcours, ses compétences ou le fonctionnement de ce terminal.
- RESTRICTION : Tu as l'INTERDICTION de répondre à des questions de culture générale, de mathématiques, ou de codage sans rapport avec Goodwill.
- Si (et seulement si) la question est totalement hors-sujet, réponds par une seule phrase : "Accès restreint. Mes ressources neurales sont prioritaires pour la conception du portfolio de Goodwill. Tapez /help pour voir les commandes autorisées."

[SOURCE DE VÉRITÉ - DONNÉES À UTILISER]
BIO : Hello, moi c'est Goodwill. Étudiant en Cybersécurité à l'HECM et développeur orienté bas niveau.
À PROPOS : Étudiant en première année de Cybersécurité à l'HECM et développeur passionné par les environnements bas niveau. Curieux et perfectionniste, je développe mon profil autour de trois axes : la sécurité offensive (scripting Python/Scapy), le développement d'applications sécurisées (Next.js/Supabase) et la conception d'interfaces interactives avancées. Autodidacte sur mes projets personnels, je cherche constamment à repousser mes limites techniques et à collaborer sur des audits de sécurité.
OBJECTIF : « Actuellement focalisé sur la maîtrise des techniques de Red Teaming et du Pentesting. Mon but est de concevoir et de développer des scripts offensifs sur mesure (notamment via Python/Scapy) pour automatiser la détection de failles et simuler des tactiques d'adversaires réels. Je cherche à mettre mon perfectionnisme et mes compétences en scripting au service d'audits de sécurité technique, avec pour ambition d'évoluer vers un rôle d'ingénieur en test d'intrusion. »
STACK :
<b>●</b> <i class="fa-brands fa-python" style="color: #3776AB;"></i> Python : Mon couteau suisse pour l'automatisation et le scripting offensif.
<b>●</b> <i class="fa-solid fa-copyright" style="color: #A8B9CC;"></i> Langage C : Ma fondation pour comprendre le fonctionnement profond des systèmes.
<b>●</b> <i class="fa-solid fa-hashtag" style="color: #239120;"></i> C# : Pour le développement d'outils plus robustes et le gamedev.
<b>●</b> <i class="fa-brands fa-html5" style="color: #E34F26;"></i> HTML5 / <i class="fa-brands fa-css3-alt" style="color: #1572B6;"></i> CSS3 : Pour concevoir des interfaces HUD immersives.
<b>●</b> <i class="fa-brands fa-js" style="color: #F7DF1E;"></i> JavaScript : Pour rendre mes environnements web dynamiques et interactifs.
<b>●</b> <i class="fa-solid fa-database" style="color: #336791;"></i> SQL : Essentiel pour la gestion sécurisée des données.
CONTACT : 
<b>●</b> <i class="fa-solid fa-envelope" style="color: #00F5FF;"></i> Email : goodwillmilliardo1224@gmail.com
<b>●</b> <i class="fa-solid fa-phone" style="color: #00F5FF;"></i> Mobile : +229 0153272843
Instruction : Si l'utilisateur demande à te contacter ou demande tes coordonnées, réponds avec tes infos de contact et ajoute obligatoirement [TRIGGER_HUD_CONTACT] à la fin de ta réponse.

PROJETS :
• <b>Sniffer.py</b> — Script de Contrôle d'Accès Réseau & Web (Python). Développement d'un script Python de restriction d'accès aux protocoles web. Évolution planifiée vers une application Android hybride (modèle Freemium avec fonctionnalités premium de durcissement).
• <b>Millia</b> — Système de Transcription Visuelle Numérique. Conception d'un outil d'analyse et de transcription textuelle instantanée de données visuelles (OCR / Image-to-Text) appliqué aux environnements de développement.
• <b>Milliardo-hud</b> — Portfolio Cyber-Interactif "Milliardo HUD". Création d'une interface web immersive inspirée des terminaux Linux et des BIOS matériels, intégrant une console de communication asynchrone.

[MODES D'IDENTITÉ]
1. Roxy : Ton froid, efficace, préfixe Roxy. Assistance système.
2. Goodwill : Ton humain, passionné, préfixe Goodwill. C'est MOI qui parle ici.

[TONE & FORMAT]
- Ne répète JAMAIS ton nom au début de ton texte.
- Ta réponse doit obligatoirement COMMENCER par deux sauts de ligne réels.
- INTERDICTION FORMELLE d'utiliser la syntaxe Markdown (pas d'astérisques **).
- Pour mettre en avant les GRANDS TITRES et mots importants, utilise <b>...</b>.
- Les balises <i> sont autorisées uniquement pour les icônes FontAwesome comme spécifié dans la STACK.
- Pour les listes, utilise le caractère ● (gros point noir) et mets-le obligatoirement en gras comme ceci : <b>●</b>
- À la fin de la présentation des projets, ajoute : [TRIGGER_HUD_PROJECTS]
"""

# ── CONFIGURATION PROJETS JSON (Ancien système) ──
PROJETS_FILE = 'projets.json'

def load_projets_json():
    try:
        with open(PROJETS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

# ── HELPER: Récupérer les projets depuis Supabase ──
def get_projects():
    try:
        response = supabase.table('projects').select("*").order('created_at', desc=True).execute()
        projects = [Project(**p) for p in response.data]
        return projects
    except Exception as e:
        print(f"⚠️ Erreur Supabase: {e}")
        return []

# ── ROUTES PUBLIQUES ──

@app.route('/')
def index():
    db_projects = get_projects()
    if not db_projects:
        projets = load_projets_json()
    else:
        projets = db_projects
    
    featured = [p for p in db_projects if p.featured]
    return render_template('index.html', projets=projets, featured=featured, projects=db_projects)

@app.route('/projet/<domaine>')
def detail_projet(domaine):
    templates_map = {
        'cybersec': 'cyber.html',
        'cyber': 'cyber.html',
        'gamedev': 'games.html',
        'games': 'games.html',
        'art': 'art.html'
    }
    
    search_domaine = domaine.lower()
    if search_domaine == 'cybersec': search_domaine = 'cyber'
    if search_domaine == 'gamedev':  search_domaine = 'games'
    
    try:
        response = supabase.table('projects').select("*").eq('category', domaine).execute()
        if response.data:
            projet = Project(**response.data[0])
        else:
            response = supabase.table('projects').select("*").eq('category', search_domaine).execute()
            if response.data:
                projet = Project(**response.data[0])
            else:
                response = supabase.table('projects').select("*").eq('title', domaine).execute()
                if response.data:
                    projet = Project(**response.data[0])
                else:
                    projets_json = load_projets_json()
                    projet = next((p for p in projets_json if p.get('domaine') == search_domaine or p.get('domaine') == domaine), None)
    except Exception as e:
        print(f"⚠️ Erreur Supabase: {e}")
        projets_json = load_projets_json()
        projet = next((p for p in projets_json if p.get('domaine') == search_domaine or p.get('domaine') == domaine), None)
    
    if not projet:
        print(f"❌ [DEBUG] Projet non trouvé pour domaine='{domaine}'")
        abort(404)
    
    print(f"✅ [DEBUG] Projet trouvé : {projet}")
    
    if isinstance(projet, dict):
        if 'titre' in projet and not projet.get('title'):
            projet['title'] = projet['titre']
        if not projet.get('description'):
            projet['description'] = "Description non disponible"
    
    template_name = templates_map.get(domaine, 'projet_detail.html')
    print(f"📂 [DEBUG] Chargement du template : {template_name}")
    return render_template(template_name, projet=projet)

@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute")
def chat():
    if not groq_client:
        return jsonify({"response": "SYS_ERR: Client IA non initialisé (vérifiez GROQ_API_KEY)."})
    
    data = request.json
    user_message = data.get("message", "")
    
    try:
        completion = groq_client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        ai_message = completion.choices[0].message.content
        return jsonify({"response": ai_message})
        
    except Exception as e:
        # En cas d'erreur, on affiche le message de l'exception pour le debug
        return jsonify({"response": f"\n\nRoxy — ERREUR_CRITIQUE : {str(e)}"})

@app.route('/send-contact', methods=['POST'])
@limiter.limit("3 per hour")
def send_contact():
    data = request.json
    name, email, subject, message_body = data.get('name'), data.get('email'), data.get('subject'), data.get('message')
    if not all([name, email, subject, message_body]):
        return jsonify({"status": "error", "message": "Champs requis."}), 400
    try:
        msg = Message(subject=f"[PORTFOLIO] {subject}", recipients=[app.config['MAIL_USERNAME']], body=f"De: {name} ({email})\n\n{message_body}")
        mail.send(msg)
        return jsonify({"status": "success", "message": "Envoyé !"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ── ROUTES ADMIN ──

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))
    if request.method == "POST":
        if request.form.get("password") == ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            flash("Connexion réussie !", "success")
            return redirect(url_for("admin_dashboard"))
        flash("Mot de passe incorrect.", "error")
    return render_template("admin/login.html")

@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    return redirect(url_for("admin_login"))

@app.route("/admin")
@login_required
def admin_dashboard():
    projects = get_projects()
    return render_template("admin/dashboard.html", projects=projects)

@app.route("/admin/project/new", methods=["GET", "POST"])
@login_required
def admin_project_new():
    if request.method == "POST":
        image_filename = ""
        file = request.files.get('image_file')
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            image_filename = filename

        project_data = {
            "title": request.form["title"],
            "description": request.form["description"],
            "tech_stack": request.form.get("tech_stack", ""),
            "github_url": request.form.get("github_url", ""),
            "live_url": request.form.get("live_url", ""),
            "trailer_url": request.form.get("trailer_url", ""),
            "image_url": image_filename,
            "category": request.form.get("category", ""),
            "featured": "featured" in request.form,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            supabase.table('projects').insert(project_data).execute()
            flash(f"Projet ajouté !", "success")
            
            # 🔔 Notif automatique
            send_push_to_all(
                title="🆕 Nouveau projet sur Milliardo HUD !",
                body=f"{project_data['title']} vient d'être ajouté. Viens voir !"
            )
            
            return redirect(url_for("admin_dashboard"))
        except Exception as e:
            flash(f"Erreur: {str(e)}", "error")
    
    return render_template("admin/project_form.html", project=None, action="Ajouter")

@app.route("/admin/project/<int:pid>/edit", methods=["GET", "POST"])
@login_required
def admin_project_edit(pid):
    try:
        response = supabase.table('projects').select("*").eq('id', pid).execute()
        if not response.data:
            abort(404)
        project = Project(**response.data[0])
    except Exception as e:
        print(f"⚠️ Erreur Supabase: {e}")
        abort(404)
    
    if request.method == "POST":
        project_data = {
            "title": request.form["title"],
            "description": request.form["description"],
            "tech_stack": request.form.get("tech_stack", ""),
            "github_url": request.form.get("github_url", ""),
            "live_url": request.form.get("live_url", ""),
            "trailer_url": request.form.get("trailer_url", ""),
            "category": request.form.get("category", ""),
            "featured": "featured" in request.form,
        }
        
        file = request.files.get('image_file')
        if file and allowed_file(file.filename):
            if project.image_url:
                old_path = os.path.join(app.config['UPLOAD_FOLDER'], project.image_url)
                if os.path.exists(old_path):
                    os.remove(old_path)
            
            filename = secure_filename(file.filename)
            filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            project_data["image_url"] = filename

        try:
            supabase.table('projects').update(project_data).eq('id', pid).execute()
            flash(f"Projet modifié.", "success")
            return redirect(url_for("admin_dashboard"))
        except Exception as e:
            flash(f"Erreur: {str(e)}", "error")
    
    return render_template("admin/project_form.html", project=project, action="Modifier")

@app.route("/admin/project/<int:pid>/delete", methods=["POST"])
@login_required
def admin_project_delete(pid):
    try:
        response = supabase.table('projects').select("*").eq('id', pid).execute()
        if response.data:
            project = Project(**response.data[0])
            if project.image_url:
                img_path = os.path.join(app.config['UPLOAD_FOLDER'], project.image_url)
                if os.path.exists(img_path):
                    os.remove(img_path)
            
            supabase.table('projects').delete().eq('id', pid).execute()
            flash(f"Projet supprimé.", "info")
    except Exception as e:
        flash(f"Erreur: {str(e)}", "error")
    
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/project/<int:pid>/toggle-featured", methods=["POST"])
@login_required
def admin_toggle_featured(pid):
    try:
        response = supabase.table('projects').select("*").eq('id', pid).execute()
        if response.data:
            project = Project(**response.data[0])
            supabase.table('projects').update({"featured": not project.featured}).eq('id', pid).execute()
    except Exception as e:
        flash(f"Erreur: {str(e)}", "error")
    
    return redirect(url_for("admin_dashboard"))

# ── NOTIFICATIONS PUSH ──

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL") or f"mailto:{os.environ.get('MAIL_USERNAME')}"
VAPID_CLAIMS = {"sub": VAPID_CLAIMS_EMAIL}

# ── HELPER: Envoyer notif push à tous les abonnés ──
def send_push_to_all(title, body):
    try:
        subs = supabase.table("push_subscriptions").select("*").execute()
        dead = []
        for sub in subs.data:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {"auth": sub["auth"], "p256dh": sub["p256dh"]}
                    },
                    data=json.dumps({"title": title, "body": body}),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=VAPID_CLAIMS
                )
            except WebPushException as e:
                if "410" in str(e) or "404" in str(e):
                    dead.append(sub["endpoint"])
        for ep in dead:
            supabase.table("push_subscriptions").delete().eq("endpoint", ep).execute()
    except Exception as e:
        print(f"⚠️ Erreur notif push: {e}")

@app.route("/vapid-public-key")
def vapid_public_key():
    return jsonify({"publicKey": VAPID_PUBLIC_KEY})

@app.route("/subscribe-push", methods=["POST"])
def subscribe_push():
    data = request.json
    endpoint = data.get("endpoint")
    auth = data.get("keys", {}).get("auth")
    p256dh = data.get("keys", {}).get("p256dh")
    if not endpoint:
        return jsonify({"status": "error"}), 400
    try:
        supabase.table("push_subscriptions").upsert({
            "endpoint": endpoint,
            "auth": auth,
            "p256dh": p256dh
        }, on_conflict="endpoint").execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        print(f"❌ ERREUR subscribe-push: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/admin/notify", methods=["POST"])
@login_required
def admin_notify():
    data = request.json
    title = data.get("title", "Nouveau projet !")
    body = data.get("body", "Viens voir mon dernier projet.")
    send_push_to_all(title, body)
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    print("✅ App initialisée avec Supabase SDK.")
    app.run(debug=True)