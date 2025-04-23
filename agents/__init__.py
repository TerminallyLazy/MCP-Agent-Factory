# Make the agents directory a Python package

# Import and re-export the required classes from pydantic_ai
from pydantic_ai import Agent as PydanticAgent, RunContext as Runner
from pydantic_ai.models.openai import ModelSettings
from pydantic_ai.tools import Tool

# Define a custom Agent class that accepts the 'instructions' parameter
class Agent(PydanticAgent):
    def __init__(self, name=None, instructions=None, model=None, model_settings=None, tools=None, **kwargs):
        # Convert instructions to system_prompt if provided
        system_prompt = instructions if instructions else kwargs.get('system_prompt')

        # Remove instructions from kwargs to avoid conflicts
        if 'instructions' in kwargs:
            del kwargs['instructions']

        # Initialize the parent class
        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            system_prompt=system_prompt,
            tools=tools or [],
            **kwargs
        )

    async def run(self, user_prompt, **kwargs):
        # Handle the 'context' parameter by converting it to 'deps'
        if 'context' in kwargs:
            kwargs['deps'] = kwargs.pop('context')

        # Call the parent class's run method
        result = await super().run(user_prompt, **kwargs)

        # Add a final_output attribute for compatibility
        try:
            # Try to use output first (newer API)
            result.final_output = getattr(result, 'output', None)
            if result.final_output is None:
                # Fall back to data (older API)
                result.final_output = getattr(result, 'data', '')
        except Exception:
            # If all else fails, use an empty string
            result.final_output = ''

        # Add a data attribute if it doesn't exist
        if not hasattr(result, 'data'):
            result.data = {}

        return result

# Define simple versions of the guardrail classes that are missing
class GuardrailFunctionOutput:
    def __init__(self, tripwire_triggered=False, output_info=None):
        self.tripwire_triggered = tripwire_triggered
        self.output_info = output_info or {}

class InputGuardrail:
    def __init__(self, function, on_trigger_message="Input not allowed"):
        self.function = function
        self.on_trigger_message = on_trigger_message

# Define a simple RunContextWrapper class
class RunContextWrapper:
    def __init__(self, context=None):
        self.context = context or {}

    def __class_getitem__(cls, item):
        return cls

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.any_schema()

# Define a simple function_tool decorator
def function_tool(func=None, *, name=None, description=None):
    """Decorator to create a tool from a function."""
    def decorator(fn):
        fn.is_tool = True
        fn.tool_name = name or fn.__name__
        fn.tool_description = description or fn.__doc__
        return fn

    if func is None:
        return decorator
    return decorator(func)