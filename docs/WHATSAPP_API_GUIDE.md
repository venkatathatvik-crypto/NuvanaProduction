# WhatsApp Business API Integration Guide

This document provides a comprehensive overview of the WhatsApp Business API, its pricing model, setup process, and how it can be implemented in the current Teacher and Admin communication modules.

## 1. Overview
The WhatsApp Business Platform (API) allows businesses to communicate with their customers at scale. Unlike the WhatsApp Business App, the API is designed for larger operations and requires a backend integration.

## 2. Pricing Model (2024-2025)
Meta has recently updated the pricing model to be more flexible. It is now moving from a "per-conversation" model to a "per-message/template" model (effective mid-2025 for some categories).

### Conversation Categories
1.  **Marketing**: Promotional offers, product announcements, etc. (Highest cost)
2.  **Utility**: Transactional updates, order confirmations, appointment reminders. (Medium cost)
3.  **Authentication**: OTPs, login codes. (Security focused)
4.  **Service**: User-initiated conversations (e.g., a parent asking a question). **These are FREE within a 24-hour window.**

### Key Pricing Highlights
*   **72-Hour Free Window**: If a user clicks an ad on Facebook/Instagram that leads to WhatsApp, the first 72 hours of conversation are free.
*   **Free Service Conversations**: Effective Nov 1, 2024, all user-initiated service conversations are free (removing the 1,000 free per month cap).
*   **Regional Pricing**: Costs vary significantly based on the recipient's country code. For India, it is generally much cheaper than for Europe or the US.

> [!NOTE]
> You only pay Meta for **Business-Initiated** messages (templates). Parent-initiated messages are free to respond to within 24 hours.

## 3. How to Get Started
To use the WhatsApp Business API, you need to follow these steps:

1.  **Meta for Developers Account**: Register at [developers.facebook.com](https://developers.facebook.com).
2.  **Create a Business App**: Select the "Business" app type.
3.  **Add WhatsApp Product**: Add the "WhatsApp" product to your app.
4.  **Verify Business**: You will need a verified Meta Business Manager account.
5.  **Phone Number**: Dedicate a phone number for the API (it must not be currently used for a regular WhatsApp/Business app account).
6.  **Payment Method**: Add a credit card to your Meta Business account for billing.

## 4. Implementation in Nuvana
In our current scenario, there are two primary use cases:

### A. Teacher Broadcast to Parents
*   **Category**: Likely **Utility** (Announcements) or **Marketing** (School events).
*   **Flow**:
    1.  Teacher selects a class and types a message.
    2.  Backend fetches parent phone numbers for that class.
    3.  Backend sends a **Template Message** via WhatsApp API to each parent.
    4.  Status (Sent, Delivered, Read) is tracked via **Webhooks**.

### B. Admin Broadcast to Parents
*   **Category**: **Utility** (Fees reminders, Holiday notices).
*   **Flow**: Similar to Teacher broadcast but can be school-wide or specific to multiple classes.

### Technical Implementation Steps
1.  **Template Registration**: Register message templates (e.g., "Dear Parent, here is an update for {{1}}: {{2}}") in the Meta dashboard. WhatsApp must approve these before use.
2.  **Backend Integration**: Use the Meta Cloud API (REST endpoints) or a library like `axios` in our Node.js/Bun backend.
3.  **Webhooks**: Set up an endpoint (e.g., `/api/whatsapp/webhook`) to receive delivery status updates.
4.  **Database**: Store parent phone numbers and message status in the database.

## 5. Next Steps
1.  **Account Setup**: I recommend setting up the Meta for Developers account first to get a "Test Number" for development.
2.  **Template Design**: Define the common messages you want to send so we can register templates.
3.  **Backend Development**: Once we have the API keys, I can implement the actual sending logic.
