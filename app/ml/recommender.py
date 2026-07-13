from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SOURCE_MODEL = "tfidf_v1"


@dataclass
class ScoredItem:
    item_type: str
    item_id: int
    score: float


def rank_items_by_interest(
    interests_text: str,
    items: List[Tuple[str, int, str]],
    top_n: int = 5,
    min_score: float = 0.05,
) -> List[ScoredItem]:
    """
    Content-based рекомендации: TF-IDF + cosine similarity между текстом
    интересов пользователя и текстом (title + description) каждого
    гранта/стипендии/стажировки.

    items — список (item_type, item_id, text).
    Возвращает top_n элементов с score >= min_score, по убыванию score.
    """
    if not interests_text or not interests_text.strip() or not items:
        return []

    corpus = [text for _, _, text in items]

    # Один общий словарь строится из всех документов + запроса пользователя,
    # иначе векторы были бы несравнимы (разная размерность/вес слов).
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus + [interests_text])

    item_vectors = tfidf_matrix[:-1]
    query_vector = tfidf_matrix[-1]

    similarities = cosine_similarity(query_vector, item_vectors)[0]

    scored = [
        ScoredItem(item_type=items[i][0], item_id=items[i][1], score=float(similarities[i]))
        for i in range(len(items))
        if similarities[i] >= min_score
    ]
    scored.sort(key=lambda s: s.score, reverse=True)
    return scored[:top_n]
