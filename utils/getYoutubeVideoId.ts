export default function (song_url: string) {
  if (song_url.includes('youtube')) {
    const url = new URL(song_url);
    const params = new URLSearchParams(url.searchParams);
    return params.get('v') as string
  } else {
    const url = new URL(song_url);
    return url.pathname.replace('/', '') as string;
  }
}