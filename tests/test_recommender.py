from app.ml.recommender import rank_items_by_interest


def test_ranks_relevant_item_higher_than_unrelated():
    items = [
        ("grant", 1, "Machine learning research funding for AI labs"),
        ("grant", 2, "Grant for community gardening and urban farming"),
        ("grant", 3, "Neural networks and deep learning research grant"),
    ]

    ranked = rank_items_by_interest("machine learning artificial intelligence research", items)

    assert len(ranked) >= 1
    top_ids = [r.item_id for r in ranked]
    # AI/ML-related grants (1 and 3) should outrank gardening (2)
    assert 2 not in top_ids or ranked[0].item_id in (1, 3)
    assert ranked[0].score > 0


def test_empty_interests_returns_no_recommendations():
    items = [("grant", 1, "Some grant about science")]

    assert rank_items_by_interest("", items) == []
    assert rank_items_by_interest("   ", items) == []
    assert rank_items_by_interest(None, items) == []


def test_no_items_returns_empty_list():
    assert rank_items_by_interest("anything", []) == []


def test_respects_top_n_limit():
    items = [
        ("grant", i, f"Research grant about topic number {i} science funding")
        for i in range(10)
    ]

    ranked = rank_items_by_interest("science research funding", items, top_n=3)

    assert len(ranked) <= 3


def test_unrelated_query_below_min_score_is_excluded():
    items = [("grant", 1, "Completely unrelated text about cooking recipes")]

    ranked = rank_items_by_interest("quantum physics research", items, min_score=0.9)

    assert ranked == []


def test_results_sorted_by_score_descending():
    items = [
        ("grant", 1, "AI machine learning deep learning neural networks"),
        ("grant", 2, "AI research"),
        ("grant", 3, "Completely unrelated topic about painting"),
    ]

    ranked = rank_items_by_interest("AI machine learning", items, min_score=0.0)

    scores = [r.score for r in ranked]
    assert scores == sorted(scores, reverse=True)
