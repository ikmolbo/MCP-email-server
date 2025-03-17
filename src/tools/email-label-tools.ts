import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { gmail_v1 } from "googleapis";

// Schema definitions
const ListLabelsSchema = z.object({});

const GetLabelSchema = z.object({
  labelId: z.string().describe("ID of the label to retrieve")
});

const CreateLabelSchema = z.object({
  name: z.string().describe("Name of the label to create"),
  messageListVisibility: z.enum(['show', 'hide']).optional()
    .describe("Controls the label's visibility in the message list (show/hide)"),
  labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional()
    .describe("Controls the label's visibility in the label list (labelShow/labelShowIfUnread/labelHide)"),
  textColor: z.string().optional().describe("Text color in hex format (e.g., #000000)"),
  backgroundColor: z.string().optional().describe("Background color in hex format (e.g., #ffffff)")
});

const UpdateLabelSchema = z.object({
  labelId: z.string().describe("ID of the label to update"),
  name: z.string().optional().describe("New name for the label"),
  messageListVisibility: z.enum(['show', 'hide']).optional()
    .describe("Controls the label's visibility in the message list (show/hide)"),
  labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional()
    .describe("Controls the label's visibility in the label list (labelShow/labelShowIfUnread/labelHide)"),
  textColor: z.string().optional().describe("Text color in hex format (e.g., #000000)"),
  backgroundColor: z.string().optional().describe("Background color in hex format (e.g., #ffffff)")
});

const DeleteLabelSchema = z.object({
  labelId: z.string().describe("ID of the label to delete")
});

const ModifyLabelsSchema = z.object({
  messageId: z.string().describe("ID of the message to modify"),
  addLabelIds: z.array(z.string()).optional().describe("Array of label IDs to add to the message"),
  removeLabelIds: z.array(z.string()).optional().describe("Array of label IDs to remove from the message")
});

const MarkAsReadSchema = z.object({
  messageId: z.string().describe("ID of the message to mark as read")
});

const MarkAsUnreadSchema = z.object({
  messageId: z.string().describe("ID of the message to mark as unread")
});

const ArchiveMessageSchema = z.object({
  messageId: z.string().describe("ID of the message to archive")
});

const UnarchiveMessageSchema = z.object({
  messageId: z.string().describe("ID of the message to move to inbox")
});

const TrashMessageSchema = z.object({
  messageId: z.string().describe("ID of the message to move to trash")
});

// Tool implementations
export const listLabelsTool: Tool = {
  name: "list_labels",
  description: "List all labels in the user's mailbox",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async (client: GmailClientWrapper, params: {}) => {
    const labels = await client.listLabels();
    return labels.map(label => ({
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      messagesTotal: label.messagesTotal,
      messagesUnread: label.messagesUnread,
      threadsTotal: label.threadsTotal,
      threadsUnread: label.threadsUnread,
      color: label.color
    }));
  }
};

export const getLabelTool: Tool = {
  name: "get_label",
  description: "Get details about a specific label",
  inputSchema: {
    type: "object",
    properties: {
      labelId: {
        type: "string",
        description: "ID of the label to retrieve"
      }
    },
    required: ["labelId"]
  },
  handler: async (client: GmailClientWrapper, params: { labelId: string }) => {
    const label = await client.getLabel(params.labelId);
    return {
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      messagesTotal: label.messagesTotal,
      messagesUnread: label.messagesUnread,
      threadsTotal: label.threadsTotal,
      threadsUnread: label.threadsUnread,
      color: label.color
    };
  }
};

export const createLabelTool: Tool = {
  name: "create_label",
  description: "Create a new label in the user's mailbox",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the label to create"
      },
      messageListVisibility: {
        type: "string",
        enum: ["show", "hide"],
        description: "Controls the label's visibility in the message list (show/hide)"
      },
      labelListVisibility: {
        type: "string",
        enum: ["labelShow", "labelShowIfUnread", "labelHide"],
        description: "Controls the label's visibility in the label list (labelShow/labelShowIfUnread/labelHide)"
      },
      textColor: {
        type: "string",
        description: "Text color in hex format (e.g., #000000)"
      },
      backgroundColor: {
        type: "string",
        description: "Background color in hex format (e.g., #ffffff)"
      }
    },
    required: ["name"]
  },
  handler: async (client: GmailClientWrapper, params: { 
    name: string;
    messageListVisibility?: 'show' | 'hide';
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    textColor?: string;
    backgroundColor?: string;
  }) => {
    // Prepare color object if colors are provided
    let color: { textColor?: string, backgroundColor?: string } | undefined;
    if (params.textColor || params.backgroundColor) {
      color = {
        textColor: params.textColor,
        backgroundColor: params.backgroundColor
      };
    }
    
    const label = await client.createLabel(params.name, {
      messageListVisibility: params.messageListVisibility,
      labelListVisibility: params.labelListVisibility,
      color
    });
    
    return {
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      color: label.color
    };
  }
};

export const updateLabelTool: Tool = {
  name: "update_label",
  description: "Update an existing label",
  inputSchema: {
    type: "object",
    properties: {
      labelId: {
        type: "string",
        description: "ID of the label to update"
      },
      name: {
        type: "string",
        description: "New name for the label"
      },
      messageListVisibility: {
        type: "string",
        enum: ["show", "hide"],
        description: "Controls the label's visibility in the message list (show/hide)"
      },
      labelListVisibility: {
        type: "string",
        enum: ["labelShow", "labelShowIfUnread", "labelHide"],
        description: "Controls the label's visibility in the label list (labelShow/labelShowIfUnread/labelHide)"
      },
      textColor: {
        type: "string",
        description: "Text color in hex format (e.g., #000000)"
      },
      backgroundColor: {
        type: "string",
        description: "Background color in hex format (e.g., #ffffff)"
      }
    },
    required: ["labelId"]
  },
  handler: async (client: GmailClientWrapper, params: { 
    labelId: string;
    name?: string;
    messageListVisibility?: 'show' | 'hide';
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    textColor?: string;
    backgroundColor?: string;
  }) => {
    // Prepare updates object
    const updates: any = {};
    if (params.name) updates.name = params.name;
    if (params.messageListVisibility) updates.messageListVisibility = params.messageListVisibility;
    if (params.labelListVisibility) updates.labelListVisibility = params.labelListVisibility;
    
    // Add color object if colors are provided
    if (params.textColor || params.backgroundColor) {
      updates.color = {
        textColor: params.textColor,
        backgroundColor: params.backgroundColor
      };
    }
    
    const label = await client.updateLabel(params.labelId, updates);
    
    return {
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      color: label.color
    };
  }
};

export const deleteLabelTool: Tool = {
  name: "delete_label",
  description: "Delete a label from the user's mailbox",
  inputSchema: {
    type: "object",
    properties: {
      labelId: {
        type: "string",
        description: "ID of the label to delete"
      }
    },
    required: ["labelId"]
  },
  handler: async (client: GmailClientWrapper, params: { labelId: string }) => {
    await client.deleteLabel(params.labelId);
    return {
      success: true,
      message: `Label ${params.labelId} has been deleted`
    };
  }
};

export const modifyLabelsTool: Tool = {
  name: "modify_labels",
  description: "Add or remove labels from a message",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to modify"
      },
      addLabelIds: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of label IDs to add to the message"
      },
      removeLabelIds: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of label IDs to remove from the message"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { 
    messageId: string;
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }) => {
    const updatedMessage = await client.modifyMessageLabels(
      params.messageId, 
      params.addLabelIds, 
      params.removeLabelIds
    );
    
    return {
      messageId: updatedMessage.id,
      threadId: updatedMessage.threadId,
      labels: updatedMessage.labelIds
    };
  }
};

// Common operations tools
export const markAsReadTool: Tool = {
  name: "mark_as_read",
  description: "Mark a message as read",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to mark as read"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    const updatedMessage = await client.markAsRead(params.messageId);
    return {
      messageId: updatedMessage.id,
      threadId: updatedMessage.threadId,
      labels: updatedMessage.labelIds
    };
  }
};

export const markAsUnreadTool: Tool = {
  name: "mark_as_unread",
  description: "Mark a message as unread",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to mark as unread"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    const updatedMessage = await client.markAsUnread(params.messageId);
    return {
      messageId: updatedMessage.id,
      threadId: updatedMessage.threadId,
      labels: updatedMessage.labelIds
    };
  }
};

export const archiveMessageTool: Tool = {
  name: "archive_message",
  description: "Archive a message (remove from inbox)",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to archive"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    const updatedMessage = await client.archiveMessage(params.messageId);
    return {
      messageId: updatedMessage.id,
      threadId: updatedMessage.threadId,
      labels: updatedMessage.labelIds
    };
  }
};

export const unarchiveMessageTool: Tool = {
  name: "unarchive_message",
  description: "Move a message back to inbox",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to move to inbox"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    const updatedMessage = await client.unarchiveMessage(params.messageId);
    return {
      messageId: updatedMessage.id,
      threadId: updatedMessage.threadId,
      labels: updatedMessage.labelIds
    };
  }
};

export const trashMessageTool: Tool = {
  name: "trash_message",
  description: "Move a message to trash",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to move to trash"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    const updatedMessage = await client.trashMessage(params.messageId);
    return {
      messageId: updatedMessage.id,
      threadId: updatedMessage.threadId,
      labels: updatedMessage.labelIds
    };
  }
}; 