import SongDocument from "./SongDocument"

export default interface Room {
    room_name: string,
    room_id: string,
    password: string,
    owner: string,
    song_list: Array<SongDocument>,
    users: Array<string>
    config: {
        disable_entrance: boolean,
        strict_chat: boolean,
        public_listing: boolean,
        visible_playlist: boolean,
        skipping_method: 'ratio' | 'owner' | 'vote' | 'any',
    }
}