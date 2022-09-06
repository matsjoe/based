#ifndef BASED_OUTGOING_H
#define BASED_OUTGOING_H

#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

#include <json.hpp>

using json = nlohmann::json;

namespace Encoder {
void append_string(std::vector<uint8_t>& buff, std::string payload) {
    char const* data = payload.data();
    for (int i = 0; i < payload.length(); i++) {
        buff.push_back(data[i]);
    }
}
std::string encode_payload(json obj) {
    return obj.dump();
};
void encode_header(std::vector<uint8_t>& buff, int32_t type, int32_t is_deflate, int32_t len) {
    // must do int32_t arithmetics because of the js client
    std::cout << "len " << len << std::endl;
    int32_t meta = (type << 1) + is_deflate;
    int32_t value = (len << 4) + meta;
    for (int i = 0; i < 4; i++) {
        uint8_t byte = (value >> (8 * i)) & 0xff;
        buff.push_back(byte);
    }
}
void encode_id(std::vector<uint8_t>& buff, int32_t id) {
    for (int i = 0; i < 3; i++) {
        uint8_t byte = (id >> (8 * i)) & 0xff;
        buff.push_back(byte);
    }
}
std::string encode_get_observe_message(int id,
                                       int type,
                                       std::string name,
                                       int checksum,
                                       std::string payload) {}
std::string encode_observe_message(int id,
                                   int type,
                                   std::string name,
                                   int checksum,
                                   std::string payload) {}

std::vector<uint8_t> encode_function_message(int32_t id, std::string name, std::string payload) {
    std::vector<uint8_t> buff;
    int32_t len = 7;
    char const* data = name.data();
    len += 1 + name.length();
    std::string p;
    if (payload.length() > 0) {
        std::cout << "Encoding payload... " << std::endl;
        p = encode_payload(json::parse(payload));
        len += p.length();
    }
    encode_header(buff, 0, 0, len);
    encode_id(buff, id);
    buff.push_back(name.length());
    append_string(buff, name);
    if (p.length()) {
        append_string(buff, payload);
    }
    for (int i = 0; i < buff.size(); i++) {
        std::cout << "buff " << i << " = " << (int)buff.at(i) << ",\t 0x" << std::hex << +buff.at(i)
                  << std::dec << std::endl;
    }

    return buff;
}
std::string encode_auth_message(int id, std::string payload) {}
};  // namespace Encoder

#endif