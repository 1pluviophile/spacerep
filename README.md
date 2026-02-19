# Spaced Repetition Learning System

A research-oriented spaced repetition system designed to optimize learning retention for technical coursework in economics, mathematics, and computer science.

## Overview

This project implements and compares various spaced repetition algorithms to identify optimal review schedules for different types of academic content. Developed as both a personal learning tool and a research platform for studying memory retention patterns in technical education.

## Research Motivation

Traditional spaced repetition systems (like Anki) use generic algorithms that may not be optimal for mathematical and technical content. This project investigates:

- How do optimal review intervals differ between conceptual knowledge (economic theory) vs. procedural knowledge (mathematical derivations)?
- Can we improve upon SM-2 and similar algorithms for technical coursework?
- What metrics best predict long-term retention in quantitative subjects?

## Features

- **Multiple Algorithm Support**: SM-2, FSRS (Free Spaced Repetition Scheduler), and custom implementations
- **Content Type Classification**: Automatic categorization (concept, procedure, fact, application)
- **Performance Tracking**: Detailed retention metrics and learning curves
- **Adaptive Scheduling**: Dynamic interval adjustment based on performance
- **Export/Import**: Compatible with standard formats for integration with other tools

## Installation

```bash
# Clone the repository
git clone https://github.com/1pluviophile/spacerep.git
cd spacerep

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Quick Start

```python
from spacerep import Card, Deck, SM2Algorithm

# Create a deck
deck = Deck(algorithm=SM2Algorithm())

# Add cards
card1 = Card(
    front="What is the steady-state condition in the Solow model?",
    back="sy = (δ + n + g)k, where investment equals depreciation",
    content_type="concept"
)
deck.add_card(card1)

# Study session
for card in deck.get_due_cards():
    # Show card, get user response
    quality = get_user_rating()  # 0-5 scale
    deck.review(card, quality)

# View statistics
deck.get_statistics()
```

## Algorithms Implemented

### 1. SM-2 (SuperMemo 2)
Classic algorithm using ease factor and interval multiplication.

**Pros**: Simple, well-tested, widely used  
**Cons**: Can lead to overly long intervals for difficult material

### 2. FSRS (Free Spaced Repetition Scheduler)
Modern algorithm using memory models and optimization.

**Pros**: More accurate predictions, better for difficult material  
**Cons**: Requires more data to calibrate

### 3. Custom Adaptive Algorithm (Research Focus)
Modified algorithm optimized for technical content with separate parameters for:
- Conceptual understanding (economic models, theorems)
- Procedural fluency (derivations, proofs)
- Factual recall (definitions, formulas)
- Applied problem-solving (problem sets, coding)

## Project Structure

```
spacerep/
├── algorithms/
│   ├── sm2.py              # SM-2 implementation
│   ├── fsrs.py             # FSRS implementation
│   └── adaptive.py         # Custom algorithm
├── core/
│   ├── card.py             # Card class
│   ├── deck.py             # Deck management
│   └── scheduler.py        # Review scheduling
├── analysis/
│   ├── statistics.py       # Performance metrics
│   └── visualization.py    # Learning curves, retention graphs
├── data/
│   ├── decks/              # User decks (gitignored)
│   └── analytics/          # Performance data
├── tests/
│   └── test_algorithms.py  # Unit tests
└── examples/
    └── sample_decks/       # Example study materials
```

## Usage Examples

### Creating Content-Specific Decks

```python
# Economics concepts deck
econ_deck = Deck(name="ECON 305 - Solow Model", algorithm=AdaptiveAlgorithm())

# Add cards with metadata
econ_deck.add_card(Card(
    front="Derive the capital accumulation equation",
    back="Δk = sy - (δ + n + g)k",
    content_type="procedure",
    difficulty="hard",
    tags=["solow-model", "growth-theory", "derivation"]
))

# Math/CS problem-solving deck
cs_deck = Deck(name="Algorithm Analysis", algorithm=AdaptiveAlgorithm())

cs_deck.add_card(Card(
    front="Time complexity of merge sort",
    back="O(n log n) - divides array in half recursively, merges in linear time",
    content_type="fact",
    tags=["algorithms", "complexity"]
))
```

### Analyzing Performance

```python
# Generate learning curves
deck.plot_retention_curve()

# Compare algorithms
comparison = compare_algorithms(
    deck=my_deck,
    algorithms=[SM2Algorithm(), FSRSAlgorithm(), AdaptiveAlgorithm()],
    simulation_days=90
)

# Export results
deck.export_statistics("econ305_performance.csv")
```

## Research Findings (Preliminary)

*Note: Update this section as you collect data*

- **Observation 1**: Mathematical derivations require shorter initial intervals than conceptual questions
- **Observation 2**: [Your findings here]
- **Observation 3**: [Your findings here]

## Personal Use Case

This system is currently being used to support:
- **ECON 305** (Intermediate Macroeconomics): Solow model, growth theory, mathematical derivations
- **Math courses**: Calculus, partial derivatives, optimization
- **Computer Science**: Algorithms, data structures, complexity analysis

**Retention goals**: Maintain 90%+ accuracy for core concepts, optimize review time to <30 min/day

## Future Development

### Short-term
- [ ] Mobile app integration
- [ ] LaTeX rendering for mathematical notation
- [ ] Import from existing Anki decks
- [ ] Web interface for review sessions

### Research Extensions
- [ ] Machine learning model to predict optimal intervals
- [ ] A/B testing framework for algorithm comparison
- [ ] Integration with learning analytics (study time, difficulty ratings)
- [ ] Neural network approach to personalized scheduling

### Graduate Research Potential
This project could extend into:
- Master's thesis on educational technology and learning optimization
- PhD research in computational models of memory and learning
- Applications to online education platforms
- Interdisciplinary work combining economics, CS, and cognitive science

## Data and Privacy

All personal study data is stored locally and not tracked or shared. The `data/` directory is gitignored to protect privacy.

For research purposes, anonymized aggregate statistics may be shared with proper consent and ethics approval.

## Contributing

This is currently a personal research project, but suggestions and discussions are welcome! Open an issue or reach out if you:
- Have ideas for algorithm improvements
- Want to discuss spaced repetition research
- Are working on similar projects

## Technical Details

**Language**: Python 3.10+  
**Key Dependencies**: numpy, pandas, matplotlib, scipy  
**Database**: SQLite for card storage  
**Testing**: pytest

## License

MIT License - See LICENSE file for details

## References

### Key Papers
1. Wozniak, P. A., & Gorzelanczyk, E. J. (1994). "Optimization of repetition spacing in the practice of learning"
2. Settles, B., & Meeder, B. (2016). "A trainable spaced repetition model for language learning"
3. [Add more relevant papers]

### Related Projects
- Anki: https://apps.ankiweb.net/
- FSRS: https://github.com/open-spaced-repetition/fsrs4anki

## Contact

**Author**: Hannah  
**Institution**: Simon Fraser University  
**Program**: Economics Major (Math & CS concentration)  
**Email**: [Your academic email if you want to share]

---

*This project is part of ongoing research in learning optimization and educational technology. Last updated: February 2026*
