// image-cropper.component.ts
import { NgIf } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import Cropper from 'cropperjs';

@Component({
    selector: 'article-image',
    standalone: true,
    templateUrl: './article-image.component.html',
    styleUrls: ['./article-image.component.css'],
    imports: [NgIf]
})
export class ArticleImageComponent implements AfterViewInit {
    @ViewChild('image') imageElement!: ElementRef;
    cropper!: Cropper;
    croppedImage!: string;

    ngAfterViewInit() {
        this.initializeCropper();
    }

    initializeCropper() {
        const image = this.imageElement.nativeElement;
        this.cropper = new Cropper(image, {
            aspectRatio: 1, // Adjust aspect ratio as needed
            viewMode: 1,
        });
    }

    cropImage() {
        const canvas = this.cropper.getCroppedCanvas({
            width: 300,
            height: 300,
        });

        this.croppedImage = canvas.toDataURL(); // Save as Base64 string
    }

    resetCropper() {
        this.cropper.reset();
    }

    destroyCropper() {
        this.cropper.destroy();
    }
}
