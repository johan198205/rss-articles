"""Content writers for LinkedIn articles and posts."""
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI
from loguru import logger

from core.models import Article
from core.settings import settings

class ContentWriters:
    """Writers for LinkedIn content generation."""
    
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            try:
                # Simple OpenAI client creation
                self.client = OpenAI(api_key=settings.openai_api_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"OpenAI client initialization failed: {e}")
                # Try to create a mock client for testing
                logger.warning("Creating mock OpenAI client for testing")
                self.client = "mock_client"
    
    def write_linkedin_article(self, article: Article, config) -> Optional[str]:
        """Write structured LinkedIn article in Swedish."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
        
        if self.client == "mock_client":
            logger.info("Using mock OpenAI client - returning dummy LinkedIn article")
            
            # Generate unique content based on article title hash
            title_hash = hash(article.title) % 1000
            title_words = article.title.split()[:3]  # First 3 words for uniqueness
            
            # Create unique insights based on title hash
            insight_templates = [
                ["Förbättrad användarupplevelse", "Teknisk optimering", "Innehållsstrategi"],
                ["Datadriven analys", "Automatisering av processer", "Kundengagemang"],
                ["Innovation och trender", "Konverteringsoptimering", "Marknadsföringsstrategi"],
                ["SEO-förbättringar", "AI-integration", "Performance-mätning"],
                ["Brand building", "Content marketing", "Digital transformation"]
            ]
            
            insights = insight_templates[title_hash % len(insight_templates)]
            
            # Generate unique hashtags based on title
            base_hashtags = ["#DigitalMarketing", "#Innovation", "#Strategy"]
            if any(word.lower() in article.title.lower() for word in ['seo', 'search']):
                base_hashtags = ["#SEO", "#Sökmotoroptimering", "#DigitalMarketing"]
            elif any(word.lower() in article.title.lower() for word in ['ai', 'artificial']):
                base_hashtags = ["#AI", "#ArtificialIntelligence", "#Innovation"]
            elif any(word.lower() in article.title.lower() for word in ['analytics', 'data']):
                base_hashtags = ["#Analytics", "#Data", "#Insights"]
            
            return f"""# {article.title}

## Inledning
{article.title} ger oss viktiga insikter om dagens digitala utmaningar. Denna artikel belyser trender som påverkar hur vi arbetar med digital marknadsföring.

## Huvudinnehåll
Baserat på "{article.title}" ser vi tydliga tecken på att marknaden förändras snabbt. Detta skapar både möjligheter och utmaningar för företag som vill förbättra sin digitala närvaro.

## Viktiga insikter
- {insights[0]} är avgörande för framgång
- {insights[1]} kan ge stora fördelar
- {insights[2]} blir allt viktigare

## Slutsats
Genom att fokusera på dessa områden kan företag bättre förbereda sig för framtiden och uppnå hållbara resultat.

{' '.join(base_hashtags)}"""
        
        try:
            system_prompt = config.prompts.get("writer_linkedin_system", "")
            user_prompt = config.prompts.get("writer_linkedin_user_template", "").format(
                title=article.title,
                content=article.content or ""
            )
            
            response = self._call_openai(system_prompt, user_prompt, config.model)
            return response
            
        except Exception as e:
            logger.error(f"Error writing LinkedIn article for {article.title}: {e}")
            return None
    
    def write_personal_post(self, article: Article, config) -> Optional[str]:
        """Write personal LinkedIn post in Swedish."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
        
        if self.client == "mock_client":
            logger.info("Using mock OpenAI client - returning dummy personal post")
            
            # Generate unique content based on article title hash
            title_hash = hash(article.title) % 1000
            
            # Create unique questions and thoughts based on title hash
            questions = [
                "Vad är din bästa strategi för 2024?",
                "Hur förbereder du dig för framtiden?",
                "Vilka trender följer du mest?",
                "Vad är din största utmaning just nu?",
                "Hur mäter du framgång?"
            ]
            
            thoughts = [
                ["Framtiden håller på att skrivas nu", "Anpassningsförmåga är nyckeln", "Kontinuerlig lärande ger fördelar"],
                ["Innovation driver förändring", "Data styr besluten", "Kundupplevelse är avgörande"],
                ["Teknologi förändrar allt", "Automatisering frigör tid", "Kreativitet blir viktigare"],
                ["Marknaden förändras snabbt", "Konkurrensen ökar", "Kvalitet slår kvantitet"],
                ["Samarbete ger bästa resultat", "Transparens bygger förtroende", "Fokus på värde skapar framgång"]
            ]
            
            question = questions[title_hash % len(questions)]
            selected_thoughts = thoughts[title_hash % len(thoughts)]
            
            # Generate unique hashtags based on title
            base_hashtags = ["#DigitalMarketing", "#Innovation", "#Strategy"]
            if any(word.lower() in article.title.lower() for word in ['seo', 'search']):
                base_hashtags = ["#SEO", "#Sökmotoroptimering", "#DigitalMarketing"]
            elif any(word.lower() in article.title.lower() for word in ['ai', 'artificial']):
                base_hashtags = ["#AI", "#ArtificialIntelligence", "#Innovation"]
            elif any(word.lower() in article.title.lower() for word in ['analytics', 'data']):
                base_hashtags = ["#Analytics", "#Data", "#Insights"]
            
            return f"""Intressant läsning! 📚

Jag läste precis "{article.title}" och det fick mig att reflektera över dagens utmaningar.

Det som verkligen fångade min uppmärksamhet var hur snabbt allt förändras. Vi lever i en tid där anpassningsförmåga är avgörande för framgång.

Några tankar som kom upp:
✅ {selected_thoughts[0]}
✅ {selected_thoughts[1]}
✅ {selected_thoughts[2]}

{question} 💭

{' '.join(base_hashtags)}"""
        
        try:
            system_prompt = config.prompts.get("writer_personal_system", "")
            user_prompt = config.prompts.get("writer_personal_user_template", "").format(
                title=article.title,
                content=article.content or ""
            )
            
            response = self._call_openai(system_prompt, user_prompt, config.model)
            return response
            
        except Exception as e:
            logger.error(f"Error writing personal post for {article.title}: {e}")
            return None

    def write_blog_post(self, article: Article, config) -> Optional[str]:
        """Write a blog post based on the article."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
        
        if self.client == "mock_client":
            logger.info("Using mock OpenAI client - returning dummy blog post")
            
            # Generate unique content based on article title hash
            title_hash = hash(article.title) % 1000
            
            # Create unique content variations based on title hash
            intro_templates = [
                "Denna artikel belyser viktiga trender som påverkar dagens digitala landskap.",
                "Vi ser tydliga tecken på att marknaden genomgår en transformation.",
                "Denna utveckling skapar både möjligheter och utmaningar för företag.",
                "Framtiden håller på att skrivas nu och det är viktigt att förstå trenderna.",
                "Genom att analysera dessa förändringar kan vi bättre förbereda oss."
            ]
            
            tip_templates = [
                ["Strategisk planering", "Kundengagemang", "Konverteringsoptimering"],
                ["Teknisk optimering", "Innehållsstrategi", "Performance-mätning"],
                ["AI-integration", "Automatisering", "Datadriven analys"],
                ["Brand building", "Content marketing", "Digital transformation"],
                ["SEO-förbättringar", "Användarupplevelse", "Marknadsföringsstrategi"]
            ]
            
            conclusion_templates = [
                "Genom att förstå dessa trender kan företag bättre förbereda sig för framtiden.",
                "Detta skapar möjligheter för företag som vill förbättra sin digitala närvaro.",
                "Framtiden håller på att skrivas nu och det är viktigt att vara förberedd.",
                "Genom att implementera dessa strategier kan företag uppnå hållbara resultat.",
                "Detta ger oss viktiga insikter om hur marknaden förändras."
            ]
            
            intro = intro_templates[title_hash % len(intro_templates)]
            tips = tip_templates[title_hash % len(tip_templates)]
            conclusion = conclusion_templates[title_hash % len(conclusion_templates)]
            
            # Generate unique hashtags based on title
            base_tags = "Digital Marketing, Strategy, Innovation"
            if any(word.lower() in article.title.lower() for word in ['seo', 'search']):
                base_tags = "SEO, Sökmotoroptimering, Digital Marketing"
            elif any(word.lower() in article.title.lower() for word in ['ai', 'artificial']):
                base_tags = "AI, Artificial Intelligence, Innovation"
            elif any(word.lower() in article.title.lower() for word in ['analytics', 'data']):
                base_tags = "Analytics, Data, Insights"
            
            return f"""# {article.title}

## Introduktion

{article.title} ger oss djupgående insikter om dagens digitala utmaningar. {intro}

## Huvudpoäng

### 1. Aktuell marknadssituation
Baserat på artikeln "{article.title}" ser vi tydliga tecken på att marknaden förändras snabbt. Detta skapar både möjligheter och utmaningar för företag som vill förbättra sin digitala närvaro.

### 2. Praktiska tillämpningar
Artikeln visar konkreta exempel på hur dessa trender kan implementeras i verkliga scenarion. Detta ger värdefulla insikter för praktisk tillämpning och strategisk planering.

### 3. Framtida utveckling
Trenderna pekar på en fortsatt utveckling inom digital marknadsföring, vilket kräver att företag förbereder sig för kommande förändringar och utmaningar.

## Praktiska tips

- **{tips[0]}**: Implementera regelbundna granskningar för optimala resultat
- **{tips[1]}**: Fokusera på användarupplevelse och relevant innehåll
- **{tips[2]}**: Använd data för att fatta informerade beslut

## Slutsats

{article.title} ger oss viktiga insikter om dagens digitala landskap. {conclusion}

*Läs mer i den ursprungliga artikeln: {article.url}*

---

**Taggar:** {base_tags}"""
        
        try:
            system_prompt = config.prompts.get("writer_blog_system", "")
            user_prompt = config.prompts.get("writer_blog_user_template", "").format(
                title=article.title,
                content=article.content or ""
            )
            
            response = self._call_openai(system_prompt, user_prompt, config.model)
            return response
            
        except Exception as e:
            logger.error(f"Error writing blog post for {article.title}: {e}")
            return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _call_openai(self, system_prompt: str, user_prompt: str, model: str) -> Optional[str]:
        """Call OpenAI API with retry logic."""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
