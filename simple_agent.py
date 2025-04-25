#!/usr/bin/env python3
"""
Simple example script using the lightweight agent approach.
"""
import asyncio
import argparse
from agents.lightweight_agent import create_agent, run_interactive_session

async def run_single_query(query, config_path=None, model_name=None):
    """
    Run a single query with the agent and return the result.
    
    Args:
        query: The query to run
        config_path: Optional path to MCP config file
        model_name: Optional model name override
    """
    client, agent = await create_agent(
        config_path=config_path, 
        model_name=model_name
    )
    
    try:
        print(f"Running query: {query}")
        result = await agent.run(query)
        
        # Handle different result formats
        if hasattr(result, 'final_output'):
            output = result.final_output
        elif hasattr(result, 'output'):
            output = result.output
        elif hasattr(result, 'data'):
            output = result.data
        else:
            output = result
            
        print("\nResult:")
        print("-" * 80)
        print(output)
        print("-" * 80)
        
        return output
    finally:
        await client.cleanup()

async def main():
    """
    Main entry point for the script.
    """
    parser = argparse.ArgumentParser(description="Simple MCP Agent")
    parser.add_argument("--config", help="Path to MCP config file")
    parser.add_argument("--model", help="Model name to use")
    parser.add_argument("--query", help="Run a single query instead of interactive mode")
    parser.add_argument("--system-prompt", help="System prompt for the agent")
    args = parser.parse_args()
    
    # If a query is provided, run it and exit
    if args.query:
        await run_single_query(
            args.query, 
            config_path=args.config,
            model_name=args.model
        )
    else:
        # Otherwise, run in interactive mode
        await run_interactive_session(
            config_path=args.config,
            model_name=args.model,
            system_prompt=args.system_prompt
        )

if __name__ == "__main__":
    asyncio.run(main())