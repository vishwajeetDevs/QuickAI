import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fs from 'fs';
import { PDFParse } from 'pdf-parse';

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== "premium" && free_usage >= 10) {
            return res.json({ success: false, message: "Limit Reached ! Upgrade to continue !" })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{
                role: "user",
                content: prompt,
            },
            ],
            temperature: 0.7,
            max_tokens: length,
        });

        const content = response.choices[0].message.content;

        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article')`

        if (plan !== "premium") {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const generateBlogTitle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== "premium" && free_usage >= 10) {
            return res.json({ success: false, message: "Limit Reached ! Upgrade to continue !" })
        }

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt, }],
            temperature: 0.7,
            max_tokens: 300,
        });

        const content = response.choices[0].message.content;

        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`

        if (plan !== "premium") {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const generateImage = async (req, res) => {
    try {

        if (!process.env.CLIPDROP_API_KEY) {
            return res.json({ success: false, message: "Clipdrop API key is missing!" });
        }

        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        if (plan !== "premium") {
            return res.json({ success: false, message: "This feature is only available for premium users!" });
        }

        const formData = new FormData();
        formData.append("prompt", prompt);

        const headers = {
            ...formData.getHeaders(),
            "x-api-key": process.env.CLIPDROP_API_KEY,
        };

        const { data } = await axios.post(
            "https://clipdrop-api.co/text-to-image/v1",
            formData,
            { headers, responseType: "arraybuffer" }
        );
        
        const base64Image = Buffer.from(data, "binary").toString("base64");
        const dataUrl = `data:image/png;base64,${base64Image}`;
        
        const result = await cloudinary.uploader.upload(dataUrl, { resource_type: "image" });

        await sql`INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${result.secure_url}, 'image', ${publish ?? false})`;

        res.json({ success: true, content: result.secure_url });

    } catch (error) {
        console.log("Generate Image Error:", error.response?.data || error.message);
        res.json({ success: false, message: error.response?.data || error.message });
    }
};





export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
        const image = req.file;
        const plan = req.plan;

        if (plan !== "premium") {
            return res.json({ success: false, message: "This feature if only avaliable for premium subscriptions !" })
        }



        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: "background_removal",
                    background_removal: "remove_the_background"
                }
            ]
        })

        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${"Remove background from image"}, ${secure_url}, 'image')`

        res.json({ success: true, content: secure_url })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}


export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const image = req.file;
        const plan = req.plan;

        if (plan !== "premium") {
            return res.json({ success: false, message: "This feature if only avaliable for premium subscriptions !" })
        }

        const { public_id } = await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation: [{ effect: `gen_remove:${object}` }],
            resource_type: 'image'
        })

        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`;

        res.json({ success: true, content: imageUrl })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}


export const resumeReview = async (req, res) => {
    try {
        const { userId } = req.auth();
        const resume = req.file;
        const plan = req.plan;

        if (plan !== "premium") {
            return res.json({ success: false, message: "This feature if only avaliable for premium subscriptions !" })
        }

        if (resume.size > 5 * 1024 * 1024) {
            return res.json({ success: false, message: "resume file size exceeds allowed size (5 MB)." })
        }

        const dataBuffer = fs.readFileSync(resume.path);

        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();

        const prompt = `Review the following resume and provide constructive feedback on its strength, weeknesses, and areas for improvement in short. Resume Content:\n\n${pdfData.text}`

        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0].message.content;

        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`;

        res.json({ success: true, content: content })

    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}