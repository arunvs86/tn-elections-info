"""
Assembles the LangGraph StateGraph for TN Elections intelligence.

Flow:
  START
    └─> supervisor
          ├─ "factcheck" ──> entity_extractor ──> wikipedia_searcher ──> db_searcher ──> web_searcher ──> verdict_agent ──> END
          └─ "eci"       ──> eci_agent ──> criminal_agent ──> promise_agent ──> END
"""
from langgraph.graph import StateGraph, END

from agents.state import TNElectionState
from agents.supervisor import supervisor_node, route
from agents.eci_agent import eci_node
from agents.criminal_agent import criminal_node
from agents.promise_agent import promise_node
from agents.entity_extractor import entity_extractor_node
from agents.wikipedia_searcher import wikipedia_searcher_node
from agents.db_searcher import db_searcher_node
from agents.web_searcher import web_searcher_node
from agents.verdict_agent import verdict_agent_node


def build_graph():
    graph = StateGraph(TNElectionState)

    # --- Register nodes ---
    graph.add_node("supervisor", supervisor_node)

    # ECI pipeline (unchanged)
    graph.add_node("eci_agent", eci_node)
    graph.add_node("criminal_agent", criminal_node)
    graph.add_node("promise_agent", promise_node)

    # Fact-check pipeline (5-agent chain)
    graph.add_node("entity_extractor", entity_extractor_node)
    graph.add_node("wikipedia_searcher", wikipedia_searcher_node)
    graph.add_node("db_searcher", db_searcher_node)
    graph.add_node("web_searcher", web_searcher_node)
    graph.add_node("verdict_agent", verdict_agent_node)

    # --- Entry point ---
    graph.set_entry_point("supervisor")

    # --- Conditional routing from supervisor ---
    graph.add_conditional_edges(
        "supervisor",
        route,
        {
            "eci": "eci_agent",
            "factcheck": "entity_extractor",  # Now routes to the pipeline start
        },
    )

    # --- ECI linear pipeline ---
    graph.add_edge("eci_agent", "criminal_agent")
    graph.add_edge("criminal_agent", "promise_agent")
    graph.add_edge("promise_agent", END)

    # --- Fact-check linear pipeline ---
    graph.add_edge("entity_extractor", "wikipedia_searcher")
    graph.add_edge("wikipedia_searcher", "db_searcher")
    graph.add_edge("db_searcher", "web_searcher")
    graph.add_edge("web_searcher", "verdict_agent")
    graph.add_edge("verdict_agent", END)

    return graph.compile()


# Module-level compiled graph — imported by main.py
election_graph = build_graph()
