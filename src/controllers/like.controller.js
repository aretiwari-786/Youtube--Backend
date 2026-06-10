import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id,
    });

    if (existingLike) {
        await existingLike.deleteOne();

        return res.status(200).json(
            new ApiResponse(200, {}, "Video unliked successfully")
        );
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id,
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Video liked successfully")
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id,
    });

    if (existingLike) {
        await existingLike.deleteOne();

        return res.status(200).json(
            new ApiResponse(200, {}, "Comment unliked successfully")
        );
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id,
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment liked successfully")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id,
    });

    if (existingLike) {
        await existingLike.deleteOne();

        return res.status(200).json(
            new ApiResponse(200, {}, "Tweet unliked successfully")
        );
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id,
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Tweet liked successfully")
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
            },
        },
        {
            $unwind: "$video",
        },
        {
            $project: {
                _id: "$video._id",
                title: "$video.title",
                description: "$video.description",
                thumbnail: "$video.thumbnail",
                views: "$video.views",
                duration: "$video.duration",
                createdAt: "$video.createdAt",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            likedVideos,
            "Liked videos fetched successfully"
        )
    );
});

export {
    getLikedVideos, toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
};
