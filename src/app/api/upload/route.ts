import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary using the environment variable or explicitly
cloudinary.config({
  cloud_name: 'dsmhjkupe',
  api_key: '148483426745695',
  api_secret: 'GM2EggP_QmdE-MMv3AncuXKOo0Q',
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string || 'docs'

    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
    if (type === 'covers') {
      resourceType = 'image'
    } else if (type === 'videos') {
      resourceType = 'video'
    } else if (['docs', 'slides', 'assignments', 'resources'].includes(type)) {
      resourceType = 'raw'
    }

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `milestone_course/${type}`,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      )

      uploadStream.end(buffer)
    })

    const result = uploadResult as any

    return NextResponse.json({ success: true, url: result.secure_url })
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error)
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 })
  }
}
