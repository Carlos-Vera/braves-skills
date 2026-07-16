---
name: braves-notebook
description: API completa para Google NotebookLM - acceso programatico completo incluyendo funciones no disponibles en la interfaz web. Crear notebooks, anadir fuentes, generar todos los tipos de artefactos, descargar en multiples formatos. Se activa con /braves-notebook o /notebooklm explicito o con intencion como "crea un podcast sobre X", "instalar notebooklm"
---
<!-- notebooklm-py v0.3.4 | Port de BrainClaude: https://github.com/Carlos-Vera/BrainClaude -->

# Automatizacion de NotebookLM

Acceso programatico completo a Google NotebookLM, incluyendo capacidades no expuestas en la interfaz web. Crear notebooks, anadir fuentes (URLs, YouTube, PDFs, audio, video, imagenes), chatear con el contenido, generar todos los tipos de artefactos y descargar resultados en multiples formatos.

## Paso 0: Configuracion (Se Ejecuta Automaticamente en el Primer Uso)

Cuando esta skill se activa y `notebooklm` aun no esta instalado o autenticado, completar la configuracion primero.

### Pre-vuelo: Verificar Version de Python

`notebooklm-py` requiere **Python 3.10+**. Verificar la version disponible antes de instalar:

```bash
python3 --version
```

Si Python esta por debajo de 3.10 (p.ej. 3.9.x que es el predeterminado de macOS), instalar una version compatible:

**macOS (Homebrew):**
```bash
brew install python@3.12
```
Luego usar `/opt/homebrew/bin/python3.12` (Apple Silicon) o `/usr/local/bin/python3.12` (Intel) para el venv a continuacion.

**Linux (apt):**
```bash
sudo apt update && sudo apt install -y python3.12 python3.12-venv
```

### Instalar el CLI

Siempre usar un entorno virtual para evitar errores de "externally-managed-environment" y problemas de PATH.

Determinar que Python usar - si el `python3` del sistema es 3.10+, usarlo directamente. De lo contrario usar el recien instalado (p.ej. `python3.12`):

```bash
# Establecer PYTHON al binario correcto (ajustar si es necesario)
PYTHON=$(command -v python3.12 2>/dev/null || command -v python3.11 2>/dev/null || command -v python3.10 2>/dev/null || command -v python3)

# Verificar que es 3.10+
$PYTHON -c "import sys; assert sys.version_info >= (3,10), f'Python {sys.version} es muy antiguo - se necesita 3.10+'; print(f'Usando Python {sys.version}')"

# Crear venv e instalar
$PYTHON -m venv ~/.notebooklm-venv
source ~/.notebooklm-venv/bin/activate
pip install "notebooklm-py[browser]"
playwright install chromium
```

Luego crear un enlace simbolico para que siempre este en el PATH:
```bash
mkdir -p ~/bin
ln -sf ~/.notebooklm-venv/bin/notebooklm ~/bin/notebooklm
export PATH="$HOME/bin:$PATH"
```

Verificar que el CLI funciona:
```bash
notebooklm --help
```

### Autenticar

**IMPORTANTE:** El comando integrado `notebooklm login` requiere entrada interactiva en terminal (presionar Enter despues de iniciar sesion). La herramienta bash de Claude Code NO soporta entrada interactiva, por lo que `notebooklm login` fallara - el navegador se abre y cierra instantaneamente. En su lugar, usar este script de login personalizado.

Decir al usuario:

> Voy a abrir una ventana del navegador - simplemente inicia sesion en tu cuenta de Google y navega a notebooklm.google.com. Tomate tu tiempo, esperare a que confirmes antes de cerrarla.

Luego escribir y ejecutar este script de login:

```bash
cat > /tmp/nlm_login.py << 'PYEOF'
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright

STORAGE_PATH = Path.home() / ".notebooklm" / "storage_state.json"
PROFILE_PATH = Path.home() / ".notebooklm" / "browser_profile"
SIGNAL_FILE = Path("/tmp/nlm_save_signal")

SIGNAL_FILE.unlink(missing_ok=True)
STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)

print("Abriendo navegador para login de Google...")
print("Inicia sesion en Google y navega a notebooklm.google.com")

with sync_playwright() as p:
    browser = p.chromium.launch_persistent_context(
        user_data_dir=str(PROFILE_PATH),
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
    )
    page = browser.pages[0] if browser.pages else browser.new_page()
    page.goto("https://notebooklm.google.com/")

    print("El navegador esta abierto. Esperando senal de guardado...")
    while not SIGNAL_FILE.exists():
        time.sleep(1)

    print("Senal de guardado recibida! Capturando sesion...")
    storage = browser.storage_state()
    with open(STORAGE_PATH, "w") as f:
        json.dump(storage, f)

    cookie_names = [c["name"] for c in storage.get("cookies", [])]
    print(f"Guardadas {len(cookie_names)} cookies: {cookie_names}")
    browser.close()

SIGNAL_FILE.unlink(missing_ok=True)
print(f"Autenticacion guardada en: {STORAGE_PATH}")
PYEOF

# Ejecutar el script de login en segundo plano
source ~/.notebooklm-venv/bin/activate
python3 /tmp/nlm_login.py > /tmp/nlm_login_output.txt 2>&1 &
echo "Login iniciado (PID=$!). El navegador deberia abrirse en unos segundos..."
```

Esperar ~10 segundos a que se abra el navegador, luego preguntar al usuario si puede ver el navegador y ha iniciado sesion.

Una vez que el usuario confirme que esta en la pagina principal de NotebookLM, guardar la sesion:

```bash
touch /tmp/nlm_save_signal
sleep 8
cat /tmp/nlm_login_output.txt
```

Luego verificar la autenticacion:

```bash
export PATH="$HOME/bin:$PATH"
notebooklm auth check
notebooklm list
```

Si la autenticacion pasa (cookie SID presente), confirmar al usuario que NotebookLM esta configurado y listo. Limpiar el script temporal y restringir permisos en el archivo de credenciales:

```bash
rm -f /tmp/nlm_login.py /tmp/nlm_login_output.txt /tmp/nlm_save_signal
chmod 600 ~/.notebooklm/storage_state.json
```

Si la autenticacion falla (cookie SID ausente), el usuario puede no haber completado el inicio de sesion. Eliminar el perfil del navegador y reintentar:

```bash
rm -rf ~/.notebooklm/browser_profile ~/.notebooklm/storage_state.json
```

Luego ejecutar el script de login de nuevo desde el principio.

---

## Cuando Se Activa Esta Skill

**Explicito:** El usuario dice "/notebooklm", "usar notebooklm", "instalar notebooklm", o menciona la herramienta por nombre

**Deteccion de intencion:** Reconocer peticiones como:
- "Crea un podcast sobre [tema]"
- "Resume estas URLs/documentos"
- "Genera un quiz de mi investigacion"
- "Convierte esto en un resumen de audio"
- "Crea tarjetas de estudio para repasar"
- "Genera un video explicativo"
- "Haz una infografia"
- "Crea un mapa mental de los conceptos"
- "Descarga el quiz en markdown"
- "Anade estas fuentes a NotebookLM"

## Reglas de Autonomia

**Ejecutar automaticamente (sin confirmacion):**
- `notebooklm status` - verificar contexto
- `notebooklm auth check` - diagnosticar problemas de autenticacion
- `notebooklm list` - listar notebooks
- `notebooklm source list` - listar fuentes
- `notebooklm artifact list` - listar artefactos
- `notebooklm language list` - listar idiomas soportados
- `notebooklm language get` - obtener idioma actual
- `notebooklm language set` - establecer idioma (configuracion global)
- `notebooklm artifact wait` - esperar a que el artefacto se complete
- `notebooklm source wait` - esperar al procesamiento de fuentes
- `notebooklm research status` - verificar estado de investigacion
- `notebooklm research wait` - esperar a la investigacion
- `notebooklm use <id>` - establecer contexto
- `notebooklm create` - crear notebook
- `notebooklm ask "..."` - consultas de chat (sin `--save-as-note`)
- `notebooklm history` - mostrar historial de conversacion (solo lectura)
- `notebooklm source add` - anadir fuentes

**Preguntar antes de ejecutar:**
- `notebooklm delete` - destructivo
- `notebooklm generate *` - larga duracion, puede fallar
- `notebooklm download *` - escribe en el sistema de archivos
- `notebooklm ask "..." --save-as-note` - escribe una nota
- `notebooklm history --save` - escribe una nota

## Referencia Rapida

| Tarea | Comando |
|-------|---------|
| Listar notebooks | `notebooklm list` |
| Crear notebook | `notebooklm create "Titulo"` |
| Establecer contexto | `notebooklm use <notebook_id>` |
| Mostrar contexto | `notebooklm status` |
| Anadir fuente URL | `notebooklm source add "https://..."` |
| Anadir archivo | `notebooklm source add ./archivo.pdf` |
| Anadir YouTube | `notebooklm source add "https://youtube.com/..."` |
| Listar fuentes | `notebooklm source list` |
| Esperar procesamiento de fuente | `notebooklm source wait <source_id>` |
| Investigacion web (rapida) | `notebooklm source add-research "consulta"` |
| Investigacion web (profunda) | `notebooklm source add-research "consulta" --mode deep --no-wait` |
| Ver estado de investigacion | `notebooklm research status` |
| Esperar investigacion | `notebooklm research wait --import-all` |
| Chat | `notebooklm ask "pregunta"` |
| Chat (fuentes especificas) | `notebooklm ask "pregunta" -s src_id1 -s src_id2` |
| Chat (con referencias) | `notebooklm ask "pregunta" --json` |
| Chat (guardar respuesta como nota) | `notebooklm ask "pregunta" --save-as-note` |
| Mostrar historial de conversacion | `notebooklm history` |
| Guardar todo el historial como nota | `notebooklm history --save` |
| Obtener texto completo de fuente | `notebooklm source fulltext <source_id>` |
| Generar podcast | `notebooklm generate audio "instrucciones"` |
| Generar video | `notebooklm generate video "instrucciones"` |
| Generar informe | `notebooklm generate report --format briefing-doc` |
| Generar quiz | `notebooklm generate quiz` |
| Generar tarjetas de estudio | `notebooklm generate flashcards` |
| Generar infografia | `notebooklm generate infographic` |
| Generar mapa mental | `notebooklm generate mind-map` |
| Generar presentacion | `notebooklm generate slide-deck` |
| Revisar una diapositiva | `notebooklm generate revise-slide "prompt" --artifact <id> --slide 0` |
| Ver estado de artefactos | `notebooklm artifact list` |
| Esperar a que se complete | `notebooklm artifact wait <artifact_id>` |
| Descargar audio | `notebooklm download audio ./salida.mp3` |
| Descargar video | `notebooklm download video ./salida.mp4` |
| Descargar presentacion (PDF) | `notebooklm download slide-deck ./diapositivas.pdf` |
| Descargar presentacion (PPTX) | `notebooklm download slide-deck ./diapositivas.pptx --format pptx` |
| Descargar informe | `notebooklm download report ./informe.md` |
| Descargar mapa mental | `notebooklm download mind-map ./mapa.json` |
| Descargar tabla de datos | `notebooklm download data-table ./datos.csv` |
| Descargar quiz | `notebooklm download quiz quiz.json` |
| Descargar tarjetas de estudio | `notebooklm download flashcards tarjetas.json` |
| Listar idiomas | `notebooklm language list` |
| Establecer idioma | `notebooklm language set zh_Hans` |

## Tipos de Generacion

Todos los comandos de generacion soportan:
- `-s, --source` para usar fuente(s) especifica(s) en lugar de todas las fuentes
- `--language` para establecer el idioma de salida (por defecto 'en')
- `--json` para salida legible por maquina
- `--retry N` para reintentar automaticamente ante limites de tasa

| Tipo | Comando | Opciones | Descarga |
|------|---------|----------|----------|
| Podcast | `generate audio` | `--format [deep-dive\|brief\|critique\|debate]`, `--length [short\|default\|long]` | .mp3 |
| Video | `generate video` | `--format [explainer\|brief]`, `--style [auto\|classic\|whiteboard\|kawaii\|anime\|watercolor\|retro-print\|heritage\|paper-craft]` | .mp4 |
| Presentacion | `generate slide-deck` | `--format [detailed\|presenter]`, `--length [default\|short]` | .pdf / .pptx |
| Revision de Diapositiva | `generate revise-slide "prompt" --artifact <id> --slide N` | `--wait`, `--notebook` | *(se redescarga la presentacion principal)* |
| Infografia | `generate infographic` | `--orientation [landscape\|portrait\|square]`, `--detail [concise\|standard\|detailed]` | .png |
| Informe | `generate report` | `--format [briefing-doc\|study-guide\|blog-post\|custom]`, `--append "instrucciones extra"` | .md |
| Mapa Mental | `generate mind-map` | *(sincrono, instantaneo)* | .json |
| Tabla de Datos | `generate data-table` | descripcion requerida | .csv |
| Quiz | `generate quiz` | `--difficulty [easy\|medium\|hard]`, `--quantity [fewer\|standard\|more]` | .json/.md/.html |
| Tarjetas de Estudio | `generate flashcards` | `--difficulty [easy\|medium\|hard]`, `--quantity [fewer\|standard\|more]` | .json/.md/.html |

## Flujos de Trabajo Comunes

### De Investigacion a Podcast
1. `notebooklm create "Investigacion: [tema]"`
2. `notebooklm source add` para cada URL/documento
3. Esperar a las fuentes: `notebooklm source list --json` hasta que todos tengan status=READY
4. `notebooklm generate audio "Enfocarse en [angulo especifico]"`
5. Verificar `notebooklm artifact list` para ver el estado
6. `notebooklm download audio ./podcast.mp3` cuando este completo

### Analisis de Documentos
1. `notebooklm create "Analisis: [proyecto]"`
2. `notebooklm source add ./doc.pdf` (o URLs)
3. `notebooklm ask "Resume los puntos clave"`
4. Continuar chateando segun sea necesario

## Formatos de Salida (--json)

```json
// notebooklm list --json
{"notebooks": [{"id": "...", "title": "...", "created_at": "..."}]}

// notebooklm source list --json
{"sources": [{"id": "...", "title": "...", "status": "ready|processing|error"}]}

// notebooklm artifact list --json
{"artifacts": [{"id": "...", "title": "...", "type": "Audio Overview", "status": "in_progress|pending|completed|unknown"}]}
```

## Manejo de Errores

| Error | Causa | Accion |
|-------|-------|--------|
| Error de autenticacion/cookie | Sesion expirada | Ejecutar `notebooklm login` de nuevo |
| "No notebook context" | Contexto no establecido | Ejecutar `notebooklm use <id>` |
| Limite de tasa | Throttle de Google | Esperar 5-10 min, reintentar |
| Fallo en descarga | Generacion incompleta | Verificar `artifact list` para ver el estado |

## Limitaciones Conocidas

- La generacion de audio, video, quiz, tarjetas de estudio, infografia y presentaciones puede fallar por limites de tasa de Google
- Tiempos de generacion: audio 10-20 min, video 15-45 min, quiz/tarjetas de estudio 5-15 min
- Esta es una API no oficial - Google puede cambiar las cosas sin previo aviso
