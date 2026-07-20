class Game {
  final String id;
  final String title;
  final String category;
  final String provider;
  final String tag;
  final String launchUrl;
  final String image;

  Game({
    required this.id,
    required this.title,
    required this.category,
    required this.provider,
    this.tag = '',
    required this.launchUrl,
    required this.image,
  });

  factory Game.fromJson(Map<String, dynamic> json) {
    return Game(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? '',
      provider: json['provider'] ?? '',
      tag: json['tag'] ?? '',
      launchUrl: json['launchUrl'] ?? json['launch_url'] ?? '',
      image: json['image'] ?? '',
    );
  }
}

class ProviderCompany {
  final String name;
  final String url;
  final String key;

  ProviderCompany({
    required this.name,
    required this.url,
    required this.key,
  });

  factory ProviderCompany.fromJson(Map<String, dynamic> json) {
    return ProviderCompany(
      name: json['name'] ?? '',
      url: json['url'] ?? '',
      key: json['key'] ?? '',
    );
  }
}
