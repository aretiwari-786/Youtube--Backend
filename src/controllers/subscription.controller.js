import { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    if (channelId === req.user._id.toString()) {
        throw new ApiError(
            400,
            "You cannot subscribe to your own channel"
        );
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId,
    });

    if (existingSubscription) {
        await existingSubscription.deleteOne();

        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Channel unsubscribed successfully"
            )
        );
    }

    await Subscription.create({
        subscriber: req.user._id,
        channel: channelId,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Channel subscribed successfully"
        )
    );
});

// Return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const subscribers = await Subscription.find({
        channel: channelId,
    }).populate(
        "subscriber",
        "username fullName avatar"
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            subscribers,
            "Subscribers fetched successfully"
        )
    );
});

// Return channels subscribed by a user
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id");
    }

    const subscribedChannels = await Subscription.find({
        subscriber: subscriberId,
    }).populate(
        "channel",
        "username fullName avatar"
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            subscribedChannels,
            "Subscribed channels fetched successfully"
        )
    );
});

export {
    getSubscribedChannels, getUserChannelSubscribers, toggleSubscription
};
