import { API_URL } from "./api";
import toast from "react-hot-toast";

export const APICALL = async ({ url, method = 'GET', body = {} }: { url: string, method?: string, body?: any }) => {
    try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const response = await fetch(`${API_URL}/api${url}`, {
            method,
            headers,
            body: JSON.stringify(body),
        });
        const json = await response.json();
        return json;
    } catch (error) {
        console.error("API Error: ", error);
        toast.error('An error occurred');
        return { status: false, message: 'An error occurred' };
    }
}