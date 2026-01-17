package com.photoswiper

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

class PhotoSwiperSAFModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var currentPickFolderPromise: Promise? = null
    private val pickFolderCode = 101
    private val ctx = reactContext

    override fun getName(): String = "PhotoSwiperSAF"

    init {
        reactContext.addActivityEventListener(object : ActivityEventListener {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                if (requestCode == pickFolderCode && currentPickFolderPromise != null) {
                    val promise = currentPickFolderPromise!!
                    currentPickFolderPromise = null

                    if (resultCode == Activity.RESULT_OK && data?.data != null) {
                        val uri = data.data!!
                        try {
                            val takeFlags = data.flags and
                                (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                            ctx.contentResolver.takePersistableUriPermission(uri, takeFlags)
                            promise.resolve(uri.toString())
                        } catch (e: Exception) {
                            promise.reject("PERM_ERROR", e.message)
                        }
                    } else {
                        promise.reject("CANCELLED", "User cancelled selection")
                    }
                }
            }

            override fun onNewIntent(intent: Intent) {}
        })
    }

    @ReactMethod
    fun pickFolder(promise: Promise) {
        val activity = ctx.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        try {
            currentPickFolderPromise = promise
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
            activity.startActivityForResult(intent, pickFolderCode)
        } catch (e: Exception) {
            promise.reject("PICK_ERROR", e.toString())
        }
    }

    @ReactMethod
    fun listImages(folderUri: String, pageSize: Int, offset: Int, promise: Promise) {
        try {
            val uri = Uri.parse(folderUri)
            val docFile = DocumentFile.fromTreeUri(ctx, uri)

            if (docFile == null || !docFile.isDirectory) {
                promise.reject("INVALID_URI", "Invalid folder URI")
                return
            }

            val images = docFile.listFiles()
                .filter { it.isFile && (it.type?.startsWith("image/") == true) }
                .sortedByDescending { it.lastModified() }
                .drop(offset)
                .take(pageSize)

            val result = WritableNativeArray()
            for (file in images) {
                val map = WritableNativeMap()
                map.putString("uri", file.uri.toString())
                map.putString("name", file.name ?: "")
                map.putString("mimeType", file.type ?: "")
                map.putDouble("size", file.length().toDouble())
                map.putDouble("modified", file.lastModified().toDouble())
                result.pushMap(map)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("LIST_ERROR", e.toString())
        }
    }

    @ReactMethod
    fun deletePhoto(photoUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(photoUri)
            val docFile = DocumentFile.fromSingleUri(ctx, uri)

            if (docFile == null) {
                promise.reject("INVALID_URI", "Invalid photo URI")
                return
            }

            val deleted = docFile.delete()
            promise.resolve(deleted)
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", e.toString())
        }
    }

    @ReactMethod
    fun moveToTrash(photoUri: String, trashFolderUri: String?, promise: Promise) {
        // Placeholder: delete for now
        deletePhoto(photoUri, promise)
    }

    @ReactMethod
    fun getPhotoDimensions(photoUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(photoUri)
            val inputStream = ctx.contentResolver.openInputStream(uri)
                ?: run {
                    promise.reject("OPEN_ERROR", "Cannot open photo")
                    return
                }

            val options = android.graphics.BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            android.graphics.BitmapFactory.decodeStream(inputStream, null, options)
            inputStream.close()

            val map = WritableNativeMap()
            map.putInt("width", options.outWidth)
            map.putInt("height", options.outHeight)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("DIMENSION_ERROR", e.toString())
        }
    }
}
