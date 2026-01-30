import app from "./app.js";
import { connectDB } from "./config/db.js";
import "dotenv/config";

const port = process.env.PORT || 4000;

// DB connection
connectDB();

app.listen(port, () => {
  console.log(`Server Started on port: ${port}`);
});

export default app;
