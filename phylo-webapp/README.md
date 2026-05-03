# Topic 15 Phylogenetic Reconstruction Web App

This Django project is built specifically for Topic 15:
- Distance-based tree reconstruction
- Neighbor Joining (NJ) reconstruction
- Reconstruction from aggregate (distance) matrices
- Evolutionary trees and hierarchical clustering (UPGMA)
- Character-based tree reconstruction (Fitch parsimony on 4 taxa)
- Minimum and maximum frugality reporting

## UI (Tailwind + Vite)

All pages (dashboard, analyses, results, auth) share one layout and stylesheet. Tailwind scans `templates/` and `phylo/templates/`; rebuild after changing HTML or `ui/src/index.css`:

```bash
cd ui
npm install
npm run build
```

## Run

```bash
python -m pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

Open: http://127.0.0.1:8000/
