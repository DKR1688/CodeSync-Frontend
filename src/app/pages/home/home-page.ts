import { Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePageComponent {
  protected readonly highlights = [
    'Feature-based Angular structure',
    'Routing ready for product pages',
    'Global design tokens with plain CSS',
    'Clear folders for shared code and API services',
  ];
}
