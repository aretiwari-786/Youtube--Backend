import { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;

    const filter = {};

    if (query) {
        filter.title = {
            $regex: query,
            $options: "i",
        };
    }

    if (userId && isValidObjectId(userId)) {
        filter.owner = userId;
    }

    const sortOptions = {
        [sortBy]: sortType === "asc" ? 1 : -1,
    };

    const videos = await Video.find(filter)
        .populate(
            "owner",
            "username fullName avatar"
        )
        .sort(sortOptions)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

    const totalVideos = await Video.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                totalVideos,
                page: Number(page),
                totalPages: Math.ceil(
                    totalVideos / Number(limit)
                ),
            },
            "Videos fetched successfully"
        )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(
            400,
            "Title and description are required"
        );
    }

    const videoFilePath =
        req.files?.videoFile?.[0]?.path;

    const thumbnailPath =
        req.files?.thumbnail?.[0]?.path;

    if (!videoFilePath) {
        throw new ApiError(
            400,
            "Video file is required"
        );
    }

    if (!thumbnailPath) {
        throw new ApiError(
            400,
            "Thumbnail is required"
        );
    }

    const uploadedVideo =
        await uploadOnCloudinary(videoFilePath);

    const uploadedThumbnail =
        await uploadOnCloudinary(thumbnailPath);

    if (!uploadedVideo) {
        throw new ApiError(
            500,
            "Failed to upload video"
        );
    }

    if (!uploadedThumbnail) {
        throw new ApiError(
            500,
            "Failed to upload thumbnail"
        );
    }

    const video = await Video.create({
        title,
        description,
        videoFile: uploadedVideo.secure_url,
        thumbnail: uploadedThumbnail.secure_url,
        duration: uploadedVideo.duration || 0,
        owner: req.user._id,
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            video,
            "Video published successfully"
        )
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId)
        .populate(
            "owner",
            "username fullName avatar"
        );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    video.views += 1;

    await video.save({
        validateBeforeSave: false,
    });

    if (req.user) {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $addToSet: {
                    watchHistory: videoId,
                },
            }
        );
        const updatedUser = await User.findById(req.user._id);

console.log(
    "WATCH HISTORY:",
    updatedUser.watchHistory
);
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (
        video.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to update this video"
        );
    }

    if (title?.trim()) {
        video.title = title;
    }

    if (description?.trim()) {
        video.description = description;
    }

    if (req.file?.path) {
        const uploadedThumbnail =
            await uploadOnCloudinary(
                req.file.path
            );

        if (!uploadedThumbnail) {
            throw new ApiError(
                500,
                "Thumbnail upload failed"
            );
        }

        video.thumbnail =
            uploadedThumbnail.secure_url;
    }

    await video.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video updated successfully"
        )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (
        video.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to delete this video"
        );
    }

    await video.deleteOne();

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (
        video.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to modify this video"
        );
    }

    video.isPublished = !video.isPublished;

    await video.save({
        validateBeforeSave: false,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Publish status updated successfully"
        )
    );
});

export {
    deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo
};
