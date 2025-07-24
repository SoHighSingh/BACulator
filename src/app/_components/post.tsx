"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function LatestPost() {

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Latest Post</h2>
      <p className="text-gray-700 mb-4">This is where the latest post content will go.</p>
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Read More
      </button>
    </div>
  );
}
