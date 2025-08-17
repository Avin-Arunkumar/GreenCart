import express from "express";
import { addAddress, getAddresses } from "../controllers/addressController.js";
import authUser from "../middlewares/authUser.js";

const addressRouter = express.Router();

// Route to add a new address
addressRouter.post("/add", authUser, addAddress);

// Route to fetch the list of addresses
addressRouter.get("/list", authUser, getAddresses);

export default addressRouter;
