"""
Assembles the LangGraph StateGraph for TN Elections intelligence.

Flow:
  START
    └─> supervisor
          ├─ "factcheck" ──> factcheck_agent ──> END
          └─ "eci"       ──> eci_agent ──> criminal_agent ──> promise_agent ──> END
"""
from langgraph.graph import StateGraph, END

from agents.state import TNElectionState
from agents.supervisor import supervisor_node, route
from agents.eci_agent import eci_node
from agents.criminal_agent import criminal_node
from agents.promise_agent import promise_node
from agents.factcheck_agent import factcheck_node


def build_graph():
    graph = StateGraph(TNElectionState)

    # --- Register nodes ---
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("eci_agent", eci_node)
    graph.add_node("criminal_agent", criminal_node)
    graph.add_node("promise_agent", promise_node)
    graph.add_node("factcheck_agent", factcheck_node)

    # --- Entry point ---
    graph.set_entry_point("supervisor")

    # --- Conditional routing from supervisor ---
    graph.add_conditional_edges(
        "supervisor",
        route,
        {
            "eci": "eci_agent",
            "factcheck": "factcheck_agent",
        },
    )

    # --- Linear pipeline after ECI ---
    graph.add_edge("eci_agent", "criminal_agent")
    graph.add_edge("criminal_agent", "promise_agent")
    graph.add_edge("promise_agent", END)

    # --- Factcheck goes straight to END ---
    graph.add_edge("factcheck_agent", END)

    return graph.compile()


# Module-level compiled graph — imported by main.py
election_graph = build_graph()
