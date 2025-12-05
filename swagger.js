const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "Library API",
    description: "Automatically generated API documentation"
  },
  host: "localhost:5000",
  schemes: ["http"]
};

const routes = ["./server.js"]; // Swagger will scan all routes from here

const outputFile = "./swagger-output.json";

swaggerAutogen(outputFile, routes, doc);

