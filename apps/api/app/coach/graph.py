"""Compile the self-hosted LangGraph coach."""

from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from app.coach.nodes import debate_synthesis, market_screener, portfolio_analyst, risk_sizing
from app.coach.state import CoachState


def build_coach_graph():
    graph = StateGraph(CoachState)
    graph.add_node("portfolio_analyst", portfolio_analyst)
    graph.add_node("market_screener", market_screener)
    graph.add_node("risk_sizing", risk_sizing)
    graph.add_node("debate_synthesis", debate_synthesis)

    graph.add_edge(START, "portfolio_analyst")
    graph.add_edge("portfolio_analyst", "market_screener")
    graph.add_edge("market_screener", "risk_sizing")
    graph.add_edge("risk_sizing", "debate_synthesis")
    graph.add_edge("debate_synthesis", END)
    return graph.compile()


@lru_cache
def get_compiled_graph():
    return build_coach_graph()
