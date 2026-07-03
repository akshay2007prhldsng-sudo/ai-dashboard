import { Router } from "express";
import { getNews } from "../providers/news.js";

export const newsRouter = Router();

newsRouter.get("/", async (_req, res) => {
  const items = await getNews();
  res.json({ items, timestamp: Date.now() });
});
