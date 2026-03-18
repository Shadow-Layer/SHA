import { config } from "./config.mjs";
import { apiGet, apiPost, assert, login, readState } from "./helpers.mjs";

export async function run(runner) {
  let postId;
  let studentJar;
  const { tenantEmail, password } = readState();

  await runner.run("TC8: Student creates forum post", async () => {
    studentJar = await login(config.BASE_URL, tenantEmail, password);
    const response = await apiPost(
      config.BASE_URL,
      "/api/forum/posts",
      {
        category: config.FORUM_CATEGORY,
        title: `E2E Forum Post ${Date.now()}`,
        body: "This is an automated forum post.",
      },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
    assert(response.body?.id, "expected forum post id");
    postId = response.body.id;
  });

  await runner.run("TC8: Forum list includes new post", async () => {
    const response = await apiGet(
      config.BASE_URL,
      `/api/forum/posts?category=${encodeURIComponent(config.FORUM_CATEGORY)}`,
      studentJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.posts) && response.body.posts.some((post) => post.id === postId),
      "expected created forum post in category listing"
    );
  });

  await runner.run("TC8: Student adds a forum comment", async () => {
    const response = await apiPost(
      config.BASE_URL,
      `/api/forum/posts/${postId}/comments`,
      { body: "Test comment" },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
  });

  await runner.run("TC8: Forum comments list includes new comment", async () => {
    const response = await apiGet(config.BASE_URL, `/api/forum/posts/${postId}/comments`, studentJar);

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(
      Array.isArray(response.body?.comments) &&
      response.body.comments.some((comment) => comment.body === "Test comment"),
      "expected created comment in comments list"
    );
  });

  await runner.run("TC8: Student can upvote forum post", async () => {
    const response = await apiPost(
      config.BASE_URL,
      `/api/forum/posts/${postId}/upvote`,
      {},
      studentJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.upvoted === true, "expected upvoted: true");
    assert(Number(response.body?.upvoteCount) >= 1, "expected upvoteCount >= 1");
  });

  await runner.run("TC8: Second upvote toggles off", async () => {
    const response = await apiPost(
      config.BASE_URL,
      `/api/forum/posts/${postId}/upvote`,
      {},
      studentJar
    );

    assert(response.status === 200, `expected status 200, got ${response.status}`);
    assert(response.body?.upvoted === false, "expected upvoted: false");
  });

  await runner.run("TC8: Student reports forum post", async () => {
    const response = await apiPost(
      config.BASE_URL,
      "/api/reports",
      {
        targetType: "post",
        targetId: postId,
        reason: "Test report",
      },
      studentJar
    );

    assert(response.status === 201, `expected status 201, got ${response.status}`);
  });
}
