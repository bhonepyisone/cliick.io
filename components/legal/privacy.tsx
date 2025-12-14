import React from 'react';

export const PrivacyPolicyContent: React.FC = () => (
    <>
        <h2>Privacy Policy for Cliick.io</h2>
        <p><strong>Effective Date:</strong> November 1, 2025</p>

        <h3>1. Introduction</h3>
        <p>Welcome to Cliick.io ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform ("Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

        <h3>2. Information We Collect</h3>
        <p>To provide you with our Service, we collect and store the following information on secure, third-party cloud servers:</p>
        <ul>
            <li><strong>Account Information:</strong> Your username, an encrypted representation of your password, and contact information you may provide.</li>
            <li><strong>Shop Information:</strong> Your shop's name, logo, product details (names, descriptions, pricing, stock levels), AI assistant configurations, and all knowledge base training data.</li>
            <li><strong>Customer Data:</strong> Any information you collect from your customers through order forms or live chat, including names, phone numbers, addresses, and order histories (FormSubmissions and LiveChatConversations).</li>
            <li><strong>Technical & Usage Data:</strong> We may collect data related to your interaction with our Service, such as IP addresses, browser type, and usage patterns, to improve and secure our platform.</li>
        </ul>

        <h3>3. How We Use Your Information</h3>
        <p>Your data is used to:</p>
        <ul>
            <li>Provide, operate, and maintain the Service.</li>
            <li>Process transactions and manage your subscription.</li>
            <li>Allow you to manage your products, orders, and customer interactions.</li>
            <li>Power and train the AI assistant for your specific shop.</li>
            <li>Communicate with you about service updates, security alerts, and support matters.</li>
            <li>Monitor and analyze usage to improve the Service's performance and user experience.</li>
        </ul>
        <p><strong>Important Note on Customer Data:</strong> You, the shop owner, are the Data Controller for the personal data of your customers. Our platform, Cliick.io, acts as the Data Processor on your behalf. You are responsible for having a legal basis to collect and process this data and for complying with all applicable privacy laws (such as GDPR) regarding your customers.</p>

        <h3>4. Data Sharing and Sub-Processors</h3>
        <p>We do not sell your personal information. We only share your data with trusted third-party service providers ("Sub-Processors") who are necessary for us to operate our Service. These include:</p>
        <ul>
            <li><strong>Cloud Hosting Providers (e.g., Google Cloud Platform, Amazon Web Services, Firebase):</strong> Your shop and customer data is securely stored on servers managed by these leading cloud providers.</li>
            <li><strong>Generative AI Providers (e.g., Google Gemini API):</strong> When you or your customers interact with the AI assistant, conversational data and relevant knowledge base information are sent to these services for processing to generate responses.</li>
            <li><strong>Payment Processors:</strong> To handle subscription payments, we may share billing information with secure payment gateways.</li>
        </ul>
        <p>We have data processing agreements in place with our Sub-Processors to ensure they handle your data with the same level of security and care that we do.</p>

        <h3>5. Data Storage, Security, and Retention</h3>
        <ul>
            <li><strong>Storage and Location:</strong> Your data is stored on secure servers provided by our cloud hosting partners. These servers may be located in various regions, including but not limited to North America, Europe, and Asia.</li>
            <li><strong>Security:</strong> We implement industry-standard security measures to protect your data, including encryption of data in transit (using TLS/SSL) and at rest, access controls, and regular security assessments. While we take robust measures to protect your information, no electronic transmission or storage system is 100% secure.</li>
            <li><strong>Retention:</strong> We retain your data based on your subscription plan's defined period (e.g., 90 days for Starter, 450 days for Pro). Data older than your plan's retention period will be scheduled for permanent deletion from our servers unless you subscribe to our "Data History Extension" add-on. We will provide notice before any data is permanently deleted.</li>
        </ul>

        <h3>6. Your Data Protection Rights (GDPR)</h3>
        <p>In accordance with data protection laws like GDPR, you have the following rights over your data:</p>
        <ul>
            <li><strong>The right to access, update, or delete:</strong> You can manage nearly all your data directly through the platform's interface. To request the deletion of your entire account and associated data, please contact our support.</li>
            <li><strong>The right to portability:</strong> You can export your product and order data as a CSV file from within the platform.</li>
            <li><strong>The right of erasure:</strong> You can request the permanent deletion of your account and all associated data by contacting us. Deletion requests will be processed in accordance with our data retention policy.</li>
        </ul>

        <h3>7. Children's Privacy</h3>
        <p>Our Service is not intended for use by anyone under the age of 16. We do not knowingly collect personally identifiable information from children.</p>

        <h3>8. Changes to This Privacy Policy</h3>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy and updating the "Effective Date" at the top.</p>

        <h3>9. Contact Us</h3>
        <p>If you have any questions about this Privacy Policy, please contact us at: support@cliick.io</p>
    </>
);
