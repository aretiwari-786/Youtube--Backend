import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = new mongoose.Types.ObjectId(req.user._id);

    const [
        totalVideos,
        totalSubscribers,
        totalViewsResult,
        totalLikesResult,
    ] = await Promise.all([
        Video.countDocuments({ owner: channelId }),

        Subscription.countDocuments({
            channel: channelId,
        }),

        Video.aggregate([
            {
                $match: {
                    owner: channelId,
                },
            },
            {
                $group: {
                    _id: null,
                    totalViews: {
                        $sum: "$views",
                    },
                },
            },
        ]),

        Video.aggregate([
            {
                $match: {
                    owner: channelId,
                },
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                },
            },
            {
                $project: {
                    likesCount: {
                        $size: "$likes",
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalLikes: {
                        $sum: "$likesCount",
                    },
                },
            },
        ]),
    ]);

    const stats = {
        totalVideos,
        totalSubscribers,
        totalViews:
            totalViewsResult.length > 0
                ? totalViewsResult[0].totalViews
                : 0,
        totalLikes:
            totalLikesResult.length > 0
                ? totalLikesResult[0].totalLikes
                : 0,
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "Channel stats fetched successfully"
        )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const videos = await Video.find({
        owner: req.user._id,
    })
        .sort({ createdAt: -1 })
        .select(
            "title description thumbnail views duration isPublished createdAt updatedAt"
        );

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully"
        )
    );
});

export {
    getChannelStats,
    getChannelVideos
};
