"""Pydantic models for the application."""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime

class FeedRule(BaseModel):
    """Feed rule configuration."""
    feed_url: str
    label: str
    source: str = ""
    language: str = ""
    topic_default: str = Field(..., description="One of: 'SEO & AI visibility', 'Webbanalys & AI', 'Generativ AI'")
    include_any: List[str] = Field(default_factory=list)
    include_all: List[str] = Field(default_factory=list)
    exclude_any: List[str] = Field(default_factory=list)
    min_words: int = 200
    max_age_days: int = 10
    source_weight: float = Field(ge=0.0, le=2.0, default=1.0)
    enabled: bool = True

class Article(BaseModel):
    """Article data structure."""
    title: str
    url: str
    published: Optional[datetime] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    word_count: int = 0
    source_label: str = ""
    source_weight: float = 1.0

class ScoreResult(BaseModel):
    """LLM scoring result."""
    topic: str
    relevance: int = Field(ge=0, le=5)
    novelty: int = Field(ge=0, le=5)
    authority: int = Field(ge=0, le=5)
    actionability: int = Field(ge=0, le=5)
    importance: Optional[float] = None
    keep: bool
    reason_short: str = Field(max_length=240)

class RunItem(BaseModel):
    """Individual item in a pipeline run."""
    article: Article
    score_result: Optional[ScoreResult] = None
    linkedin_article: Optional[str] = None
    personal_post: Optional[str] = None
    status: str = Field(..., description="'kept', 'skipped', 'filtered'")
    reason: str = ""

class RunResponse(BaseModel):
    """Response from pipeline run."""
    kept_count: int
    skipped_count: int
    filtered_count: int
    duration_seconds: float
    items: List[RunItem]
    dry_run: bool

class ConfigModel(BaseModel):
    """Application configuration."""
    model: str = "gpt-4o-mini"
    threshold: Dict[str, float] = Field(default_factory=lambda: {"importance": 3.2})
    defaults: Dict[str, Union[int, str, List[str]]] = Field(default_factory=lambda: {
        "min_words": 200,
        "max_age_days": 10,
        "language": "",
        "include_any": [],
        "include_all": [],
        "exclude_any": []
    })
    feeds: List[FeedRule] = Field(default_factory=list)
    prompts: Dict[str, str] = Field(default_factory=lambda: {
        "classifier_system": "Du returnerar exakt en av givna kategorierna, inget extra.",
        "classifier_user_template": """Premisser:
include_any={include_any}
include_all={include_all}
exclude_any={exclude_any}

Klassificera topic till en av:
- SEO & AI visibility
- Webbanalys & AI
- Generativ AI

Betygsätt 0–5:
- relevance
- novelty
- authority
- actionability

Returnera JSON exakt enligt:
{{
  "topic": "<en av tre>",
  "relevance": 0-5,
  "novelty": 0-5,
  "authority": 0-5,
  "actionability": 0-5,
  "importance": 0-5,
  "keep": true/false,
  "reason_short": "max 240 tecken"
}}

Källa: {source_label} (weight {source_weight})
Titel: {title}
URL: {url}
Text: \"\"\"{snippet_or_fulltext}\"\"\"""",
        "writer_linkedin_system": "Du skriver på flytande svenska i en professionell och inspirerande ton.",
        "writer_linkedin_user_template": """Skriv om artikeln på svenska för en LinkedIn-artikel.
STRUKTUR:
- Rubrik (kort och slagkraftig)
- Ingress (1–2 meningar)
- Brödtext (3–5 stycken, gärna underrubriker)
- Viktiga insikter (punktlista)
Titel: {title}
Innehåll:
{content}""",
        "writer_personal_system": "Du skriver på flytande svenska i en personlig men professionell ton.",
        "writer_personal_user_template": """Skriv ett LinkedIn-inlägg med personlig touch utifrån artikeln.
KRAV:
- Hook i första raden
- Korta stycken (max 2–3 meningar)
- Praktisk koppling till arbete/vardag
- Avsluta med en engagerande fråga/CTA
Titel: {title}
Innehåll:
{content}""",
        "writer_blog_system": "Du skriver på flytande svenska i en informativ och engagerande ton för blogginnehåll.",
        "writer_blog_user_template": """Skriv en bloggartikel på svenska baserat på artikeln.
STRUKTUR:
- Rubrik (SEO-optimerad och lockande)
- Meta-beskrivning (150-160 tecken)
- Inledning (hook och problemformulering)
- Huvudinnehåll (3-5 sektioner med underrubriker)
- Praktiska tips/insikter
- Slutsats med call-to-action
- Relevanta nyckelord integrerade naturligt

SEO-KRAV:
- Minst 1000 ord
- Underrubriker (H2, H3)
- Punktlistor och numrerade listor
- Inre länkar (markera med [LÄNK: beskrivning])
- Läsbarhet: korta stycken, meningar under 20 ord

Titel: {title}
Innehåll:
{content}"""
    })

class SecretSetRequest(BaseModel):
    """Request to set a secret."""
    key: str = Field(..., description="'openai' or 'notion'")
    value: str

class SecretTestRequest(BaseModel):
    """Request to test a secret."""
    key: str = Field(..., description="'openai' or 'notion'")

class SecretTestResponse(BaseModel):
    """Response from secret test."""
    ok: bool
    message: str
