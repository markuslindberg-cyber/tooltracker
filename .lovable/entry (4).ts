import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    // Get all tools
    const tools = await base44.entities.Tool.list('-updated_date', 1000);

    // Filter tools without images
    const toolsWithoutImages = tools.filter(t => !t.image_url);

    if (toolsWithoutImages.length === 0) {
      return Response.json({ message: 'Alla verktyg har redan bilder', processed: 0 });
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each tool - invoke findToolImage for each with delay to avoid rate limiting
    for (const tool of toolsWithoutImages) {
      try {
        await base44.functions.invoke('findToolImage', { tool_id: tool.id });
        successCount++;
      } catch (error) {
        console.error(`Failed to search image for tool ${tool.id}:`, error);
        errorCount++;
      }
      // Wait 2 seconds between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return Response.json({
      message: 'Bildsökning slutförd',
      processed: successCount,
      failed: errorCount,
      total: toolsWithoutImages.length
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});