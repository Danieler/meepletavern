const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function publishToInstagram(
  imageUrls: string[],
  caption: string
): Promise<string> {
  if (!INSTAGRAM_ACCOUNT_ID || !INSTAGRAM_ACCESS_TOKEN) {
    throw new Error(
      "Instagram credentials not configured. Please set INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN in .env"
    );
  }

  if (imageUrls.length === 0) {
    throw new Error("No images provided to publishToInstagram");
  }

  // Ensure maximum of 10 images for Instagram Carousel
  const urlsToPublish = imageUrls.slice(0, 10);

  let creationId: string;

  if (urlsToPublish.length === 1) {
    // Single Image Post
    const mediaContainerUrl = new URL(`${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/media`);
    const containerResponse = await fetch(mediaContainerUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: urlsToPublish[0],
        caption: caption,
        access_token: INSTAGRAM_ACCESS_TOKEN
      })
    });
    const containerData = await containerResponse.json();
    if (!containerResponse.ok || !containerData.id) {
      console.error("Instagram Media Container Error:", containerData);
      throw new Error(containerData.error?.message || "Failed to create Instagram media container");
    }
    creationId = containerData.id;
  } else {
    // Carousel Post
    const childrenIds: string[] = [];
    
    // Step 1: Create child containers for each image
    for (const url of urlsToPublish) {
      const childUrl = new URL(`${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/media`);
      const childResponse = await fetch(childUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: url,
          is_carousel_item: true,
          access_token: INSTAGRAM_ACCESS_TOKEN
        })
      });
      const childData = await childResponse.json();
      if (!childResponse.ok || !childData.id) {
        console.error("Instagram Carousel Child Error:", childData);
        throw new Error(childData.error?.message || "Failed to create carousel item");
      }
      childrenIds.push(childData.id);
    }

    // Step 2: Create the main carousel container
    const carouselUrl = new URL(`${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/media`);
    const carouselResponse = await fetch(carouselUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childrenIds,
        caption: caption,
        access_token: INSTAGRAM_ACCESS_TOKEN
      })
    });
    const carouselData = await carouselResponse.json();
    if (!carouselResponse.ok || !carouselData.id) {
      console.error("Instagram Carousel Container Error:", carouselData);
      throw new Error(carouselData.error?.message || "Failed to create carousel container");
    }
    creationId = carouselData.id;
  }

  // Wait for media to be processed by Instagram
  await waitForMediaProcessing(creationId);

  // Step 2: Publish the media container
  const publishUrl = new URL(`${GRAPH_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/media_publish`);
  
  const publishResponse = await fetch(publishUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: INSTAGRAM_ACCESS_TOKEN
    })
  });

  const publishData = await publishResponse.json();

  if (!publishResponse.ok || !publishData.id) {
    console.error("Instagram Publish Error:", publishData);
    throw new Error(
      publishData.error?.message || "Failed to publish Instagram media"
    );
  }

  // Returns the Instagram Post ID
  return publishData.id;
}

async function waitForMediaProcessing(containerId: string): Promise<void> {
  const maxRetries = 15;
  const delayMs = 3000;
  
  for (let i = 0; i < maxRetries; i++) {
    const statusUrl = new URL(`${GRAPH_API_BASE}/${containerId}`);
    statusUrl.searchParams.append("fields", "status_code");
    statusUrl.searchParams.append("access_token", process.env.INSTAGRAM_ACCESS_TOKEN as string);

    const response = await fetch(statusUrl.toString());
    const data = await response.json();

    if (data.status_code === "FINISHED") {
      return;
    } else if (data.status_code === "ERROR") {
      throw new Error("Instagram Media processing failed: " + JSON.stringify(data));
    }

    // If IN_PROGRESS or otherwise, wait and retry
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error("Instagram Media processing timed out after " + (maxRetries * delayMs / 1000) + " seconds.");
}
