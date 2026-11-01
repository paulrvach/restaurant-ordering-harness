# Convex owns conversation state

Store durable messages in the Convex Agent component and thread metadata in the application schema. assistant-ui owns the composer and visible message tree; its format adapter preserves message IDs and parent links in the component, with transactional reference rows for updates and deletion. This replaces whole-history writes that could overwrite another client's messages, while retaining existing conversations through lazy migration.

Mastra runs bounded inference through the Next server using the direct Meta endpoint. Before inference, the server saves the user prompt and reconstructs its branch from Convex; it also saves completed replies. No Mastra memory store or assistant-cloud account is configured, so conversation recovery has one database. The app remains a shared development workspace without per-user authorization. Restaurant calculations stay behind `planOrder`; this chat repair does not restore the removed worksheet tool cards.
