const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const validPassword = password.length >= 5 ? true : false;
  const getUserQuery = `
    SELECT 
        *
    FROM
        user
    WHERE
        username = '${username}';
  `;

  if (validPassword) {
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const dbUser = await db.get(getUserQuery);
      if (!dbUser) {
        const createUserQuery = `
            INSERT INTO
                user(username, name, password, gender, location)
            VALUES
            ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');
        `;
        await db.run(createUserQuery);
        response.status = 200;
        response.send("User created successfully");
      }
      if (dbUser) {
        response.status = 400;
        response.send("User already exists");
      }
    } catch (e) {
      console.error(`DB Error : ${e.message}`);
    }
  }
  if (!validPassword) {
    response.status = 400;
    response.send("Password is too short");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
    SELECT 
        *
    FROM
        user
    WHERE
        username = '${username}';
  `;
  try {
    const dbUser = await db.get(getUserQuery);
    if (!dbUser) {
      response.status = 400;
      response.send("Invalid user");
    }
    if (dbUser) {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched) {
        response.status = 200;
        response.send("Login success!");
      }
      if (!isPasswordMatched) {
        response.status = 400;
        response.send("Invalid password");
      }
    }
  } catch (e) {
    console.error(`DB Error: ${e.message}`);
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUserQuery = `
    SELECT 
        *
    FROM
        user
    WHERE
        username = '${username}';
  `;
  try {
    const dbUser = await db.get(getUserQuery);
    if (!dbUser) {
      response.status = 400;
      response.send("Invalid user");
    }
    if (dbUser) {
      const isPasswordMatched = await bcrypt.compare(
        oldPassword,
        dbUser.password
      );

      if (isPasswordMatched) {
        if (newPassword.length >= 5) {
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          const updateDetailsQuery = `
                    UPDATE 
                        user
                    SET
                        password = '${hashedPassword}'
                    WHERE
                        username = '${username}'
            `;
          await db.run(updateDetailsQuery);
          response.status = 200;
          response.send("Password updated");
        } else {
          response.status = 400;
          response.send("Password is too short");
        }
      } else {
        response.status = 400;
        response.send("Invalid current password");
      }
    }
  } catch (e) {
    console.error(`DB Error: ${e.message}`);
  }
});

module.exports = app;
