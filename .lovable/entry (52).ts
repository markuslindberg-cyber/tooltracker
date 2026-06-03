import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'verktygsförvaltare', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { tool_id } = await req.json();

    if (!tool_id) {
      return Response.json({ error: 'tool_id is required' }, { status: 400 });
    }

    // Get tool details
    const tool = await base44.entities.Tool.get(tool_id);

    if (!tool) {
      return Response.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Skip if tool already has an image
    if (tool.image_url) {
      return Response.json({ message: 'Tool already has an image', image_url: tool.image_url });
    }

    // Build prompt for AI image generation
    const prompt = `Generate a professional, clean product photograph of a ${tool.name}${tool.manufacturer ? ` by ${tool.manufacturer}` : ''}${tool.model_number ? ` model ${tool.model_number}` : ''}. The image should be on a white or neutral background, well-lit, showing the tool clearly and realistically from a front angle. High quality product photography style.`;

    // Generate image using AI
    const generateResult = await base44.integrations.Core.GenerateImage({
      prompt: prompt,
    });

    if (!generateResult?.url) {
      return Response.json({ error: 'Could not generate image' }, { status: 500 });
    }

    const imageUrl = generateResult.url;

    // Save the suggested image to the tool
    await base44.entities.Tool.update(tool_id, { suggested_image_url: imageUrl });

    return Response.json({ image_url: imageUrl, success: true });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});