# AI Assignment Evaluator – offline / local version

Evaluate answer files on your own computer, **without any cloud service**. Two offline engines:

| Engine | What it needs | Best for |
|---|---|---|
| **Local AI (Ollama)** | Ollama installed on your PC | Any answers, including scanned/handwritten (with a vision model) |
| **Offline keyword marking** | Nothing, no AI | Typed PDF/text answers with a keyword-style scheme |

(Claude cloud is still available as a third option, but you do not need it.)

## One-time setup (needs internet once)
1. **Libraries:** run `get-libs.bat` (Windows) or `./get-libs.sh` (Mac/Linux). It saves 4 files into `libs/`.
2. **Local AI (optional but recommended):**
   - Install Ollama from ollama.com.
   - Pull a model: `ollama pull qwen2.5vl:7b` (reads scanned/handwritten pages) and/or `ollama pull llama3.1:8b` (text only, lighter).
   - Allow the web page to talk to Ollama, then restart Ollama:
     - Windows: `setx OLLAMA_ORIGINS "*"`
     - Mac: `launchctl setenv OLLAMA_ORIGINS "*"`
     - Linux: start with `OLLAMA_ORIGINS="*" ollama serve`

## Every time
1. Run `start-local.bat` (Windows) or `./start-local.sh` (Mac/Linux) and open http://localhost:8000.
2. Settings: choose the engine (and the Ollama model name if needed).
3. Tab 1: question paper. Tab 2: answer key and scheme. Tab 3: upload the student files or one .zip.
   (The Google Drive fetch needs internet, so for offline use download the folder from Drive first.)
4. Tab 4: **Evaluate**, then download the results and remarks Excel files.

## Offline keyword marking
Write the answer key as a text file (see `sample-answer-key.txt`), one line per question:

    Q1 | 4 | photosynthesis, chlorophyll/green pigment, sunlight, glucose

`question | max marks | key points`. Key points are separated by commas; use `/` for alternative wording. Marks = max marks x share of key points found in that student's answer, rounded to the nearest 0.5. The remark lists the missing points. Student answers should be labelled Q1, Q2 ... (or 1., 2. ...) so each answer can be found; if a label is missing, the whole script is searched.
Limits: no reading of scanned/handwritten pages, and it checks words, not meaning.

## Notes
- Local AI quality depends on the model and your hardware; small models can mis-mark. Spot-check results.
- Nothing is uploaded anywhere in the two offline modes; files stay in your browser.
- Settings can be changed in `config.json`.
