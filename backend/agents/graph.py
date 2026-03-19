"""
graph.py — The LangGraph StateGraph assembly.

WHAT THIS FILE DOES:
    Wires all agents together into a single directed graph.
    This is the "circuit board" that connects everything.

    Graph structure:

        START → supervisor → [route_to_agent decides] → eci_agent
                                                      → criminal_agent
                                                      → factcheck_agent
                                                      → promise_agent
                                                      → END

    After each specialist agent runs, control returns to supervisor,
    which decides the next step.

WHY THIS WAY:
    The StateGraph pattern (not a simple chain) gives us:
    1. Dynamic routing — different paths for different query types
    2. Shared state — all agents read the same dict
    3. Easy to add new agents — just add_node() and update supervisor
    4. Observable — every state transition is logged

WHAT BREAKS WITHOUT IT:
    Nothing connects. Agents are just isolated Python functions
    without this file to orchestrate them.
"""

from langgraph.graph import StateGraph, END

from .state import TNElectionState
from .supervisor import supervisor_node, route_to_agent
from .eci_agent import eci_node
from .criminal_agent import criminal_node
from .factcheck_agent import factcheck_node
from .promise_agent import promise_node


def build_graph():
    """
    Build and compile the LangGraph StateGraph.

    Returns a compiled graph object you can call .invoke() on.
    """
    # Create the graph with our shared state type
    graph = StateGraph(TNElectionState)

    # ── Add nodes (each node = one agent function) ────────────────────────
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("eci_agent", eci_node)
    graph.add_node("criminal_agent", criminal_node)
    graph.add_node("factcheck_agent", factcheck_node)
    graph.add_node("promise_agent", promise_node)

    # ── Set entry point — supervisor always runs first ────────────────────
    graph.set_entry_point("supervisor")

    # ── Conditional edges from supervisor ─────────────────────────────────
    # After supervisor runs, call route_to_agent() to determine next node.
    # The dict maps the returned string to the actual node name.
    graph.add_conditional_edges(
        "supervisor",
        route_to_agent,
        {
            "eci_agent":      "eci_agent",
            "criminal_agent": "criminal_agent",
            "factcheck_agent": "factcheck_agent",
            "promise_agent":  "promise_agent",
            "END":            END,
        }
    )

    # ── After each specialist, go back to supervisor ───────────────────────
    # This creates the loop: supervisor → agent → supervisor → next agent → … → END
    for agent in ["eci_agent", "criminal_agent", "factcheck_agent", "promise_agent"]:
        graph.add_edge(agent, "supervisor")

    # Compile and return
    return graph.compile()


# Singleton — build once at import time, reuse across requests
investigation_graph = build_graph()
